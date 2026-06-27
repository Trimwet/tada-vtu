/**
 * POST /api/withdrawal/transfer
 *
 * Bank withdrawal via Flutterwave. All balance operations go through Go Core
 * which enforces atomic updates, overdraft protection, and idempotency.
 *
 * Flow:
 *   1. Authenticate via session
 *   2. Verify PIN
 *   3. Get Flutterwave transfer fee
 *   4. Create withdrawals record (for webhook tracking)
 *   5. coreDebit — atomic debit + pending tx record (idempotent)
 *   6. Initiate Flutterwave transfer
 *   7a. On success → update withdrawals record + notify
 *   7b. On failure → coreRefund (atomic refund + failed tx record + notify) + update withdrawals
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { initiateTransfer, getTransferFee } from '@/lib/api/flutterwave-transfer';
import { coreDebit, coreRefund } from '@/lib/api/core';

const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 500000;

function hashPin(pin: string): string {
  return Buffer.from(pin + 'tada_salt_2024').toString('base64');
}
function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createSupabaseClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { bankCode, bankName, accountNumber, accountName, amount, pin } = await request.json();

    if (!bankCode || !accountNumber || !accountName || !amount) {
      return NextResponse.json({ status: 'error', message: 'All fields are required' }, { status: 400 });
    }
    if (!pin || pin.length !== 4) {
      return NextResponse.json({ status: 'error', message: 'Please enter your 4-digit PIN' }, { status: 400 });
    }

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount < MIN_WITHDRAWAL) {
      return NextResponse.json({ status: 'error', message: `Minimum withdrawal is ₦${MIN_WITHDRAWAL}` }, { status: 400 });
    }
    if (withdrawalAmount > MAX_WITHDRAWAL) {
      return NextResponse.json({ status: 'error', message: `Maximum withdrawal is ₦${MAX_WITHDRAWAL.toLocaleString()}` }, { status: 400 });
    }

    // ── PIN verification (Supabase only — Core doesn't handle PINs) ──────────
    const adminSupabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('pin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ status: 'error', message: 'User not found' }, { status: 404 });
    }
    if (!profile.pin) {
      return NextResponse.json({ status: 'error', message: 'Please set up your transaction PIN first' }, { status: 400 });
    }
    if (!verifyPin(pin, profile.pin)) {
      return NextResponse.json({ status: 'error', message: 'Invalid transaction PIN' }, { status: 401 });
    }

    // ── Calculate fee ─────────────────────────────────────────────────────────
    const transferFee = await getTransferFee(withdrawalAmount);
    const totalDebit = withdrawalAmount + transferFee;

    const reference = `TADA-WD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const description = `Withdrawal to ${accountName} (${accountNumber})`;

    // ── Create withdrawal record (before debit so webhook has something to track) ─
    const { error: withdrawalError } = await adminSupabase.from('withdrawals').insert({
      user_id: user.id,
      amount: withdrawalAmount,
      fee: transferFee,
      net_amount: withdrawalAmount,
      account_number: accountNumber,
      account_name: accountName,
      bank_code: bankCode,
      bank_name: bankName || 'Bank',
      status: 'processing',
      reference,
    });

    if (withdrawalError) {
      console.error('[WITHDRAWAL/TRANSFER] withdrawals insert failed:', withdrawalError);
      return NextResponse.json(
        { status: 'error', message: `Failed to create withdrawal record: ${withdrawalError.message}` },
        { status: 500 }
      );
    }

    // ── Step 1: Atomic debit via Core ─────────────────────────────────────────
    // Core enforces no-overdraft atomically — no TOCTOU, no direct balance writes.
    // Core also creates the pending transaction record.
    try {
      await coreDebit({
        userId: user.id,
        amount: totalDebit,
        reference,
        serviceType: 'withdrawal',
        description,
        metadata: {
          bank_code: bankCode,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          fee: transferFee,
          net_amount: withdrawalAmount,
        },
      });
    } catch (debitError) {
      // Roll back the withdrawal record — debit never happened
      await adminSupabase.from('withdrawals').delete().eq('reference', reference);

      const msg = debitError instanceof Error ? debitError.message : 'Debit failed';
      if (msg.includes('insufficient funds')) {
        const balanceMatch = msg.match(/balance ([\d.]+)/);
        const bal = balanceMatch ? `₦${Number(balanceMatch[1]).toLocaleString()}` : 'insufficient';
        return NextResponse.json({
          status: 'error',
          message: `Insufficient balance. You need ₦${totalDebit.toLocaleString()} (₦${withdrawalAmount.toLocaleString()} + ₦${transferFee.toLocaleString()} fee). Current balance: ${bal}`,
        }, { status: 400 });
      }
      if (msg.includes('profile not found')) {
        return NextResponse.json({ status: 'error', message: 'User not found' }, { status: 404 });
      }
      console.error('[WITHDRAWAL/TRANSFER] Core debit failed:', debitError);
      return NextResponse.json({ status: 'error', message: 'Failed to process withdrawal. Please try again.' }, { status: 500 });
    }

    // ── Step 2: Initiate Flutterwave transfer ─────────────────────────────────
    try {
      console.log('[WITHDRAWAL/TRANSFER] Initiating Flutterwave transfer:', reference);
      const transferResult = await initiateTransfer({
        bankCode,
        accountNumber,
        accountName,
        amount: withdrawalAmount,
        reference,
        userId: user.id,
        narration: `TADA VTU Withdrawal - ${reference}`,
      });
      console.log('[WITHDRAWAL/TRANSFER] Result:', transferResult);

      if (!transferResult.success) {
        throw new Error(transferResult.message || 'Transfer failed');
      }

      // Update transaction and withdrawal records with Flutterwave reference
      await adminSupabase
        .from('transactions')
        .update({ external_reference: transferResult.reference })
        .eq('reference', reference);

      await adminSupabase
        .from('withdrawals')
        .update({ flw_reference: transferResult.reference, status: 'processing' })
        .eq('reference', reference);

      await adminSupabase.from('notifications').insert({
        user_id: user.id,
        type: 'info',
        title: 'Withdrawal Processing 💸',
        message: `Your withdrawal of ₦${withdrawalAmount.toLocaleString()} to ${accountName} is being processed.`,
      });

      return NextResponse.json({
        status: 'success',
        message: 'Withdrawal initiated successfully',
        data: {
          reference: transferResult.reference,
          amount: withdrawalAmount,
          fee: transferFee,
          totalDebit,
          accountName,
          accountNumber,
          status: transferResult.status,
        },
      });

    } catch (transferError) {
      const errorMessage = transferError instanceof Error ? transferError.message : 'Transfer failed';
      console.error('[WITHDRAWAL/TRANSFER] Transfer error:', errorMessage);

      // ── Flutterwave failed — refund atomically via Core ───────────────────
      // coreRefund: credits balance, marks original tx failed, inserts refund record, notifies user.
      try {
        await coreRefund({
          userId: user.id,
          amount: totalDebit,
          reference: `REFUND_${reference}`,
          originalReference: reference,
          description: `Withdrawal refund - ${reference}`,
        });
      } catch (refundError) {
        console.error('[WITHDRAWAL/TRANSFER] Refund failed — MANUAL ACTION REQUIRED for ref:', reference, refundError);
        return NextResponse.json(
          { status: 'error', message: 'Transfer failed and the refund could not be completed automatically. Support has been alerted.' },
          { status: 502 }
        );
      }

      await adminSupabase
        .from('withdrawals')
        .update({ status: 'failed', failure_reason: errorMessage })
        .eq('reference', reference);

      let userMessage = 'Transfer failed. Your balance has been refunded.';
      if (errorMessage.includes('IP Whitelisting')) {
        userMessage = 'Withdrawal service temporarily unavailable. Please try again later.';
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        userMessage = 'Flutterwave balance insufficient. Please contact support.';
      }

      return NextResponse.json({ status: 'error', message: userMessage }, { status: 500 });
    }

  } catch (error) {
    console.error('[WITHDRAWAL/TRANSFER] Unexpected error:', error);
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Withdrawal failed' },
      { status: 500 }
    );
  }
}
