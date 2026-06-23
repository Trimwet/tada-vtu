import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { initiateTransfer, calculateWithdrawalFee } from '@/lib/api/flutterwave';
import { coreDebit, coreRefund } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

const MIN_WITHDRAWAL = 500;    // Minimum ₦500
const MAX_WITHDRAWAL = 50000;  // Maximum ₦50,000 per transaction

function hashPin(pin: string): string {
  return Buffer.from(pin + 'tada_salt_2024').toString('base64');
}
function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      amount,
      bankCode,
      bankName,
      accountNumber,
      accountName,
      pin,
    } = await request.json();

    // ── Input validation ──────────────────────────────────────────────────────
    if (!userId || !amount || !bankCode || !accountNumber || !accountName || !pin) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL}` },
        { status: 400 }
      );
    }
    if (amount > MAX_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Maximum withdrawal is ₦${MAX_WITHDRAWAL.toLocaleString()}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // ── PIN verification (Supabase only — Core doesn't know about PINs) ──────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, pin')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!profile.pin) {
      return NextResponse.json(
        { error: 'Please set up your transaction PIN first' },
        { status: 400 }
      );
    }
    if (!verifyPin(pin, profile.pin)) {
      return NextResponse.json({ error: 'Invalid transaction PIN' }, { status: 401 });
    }

    // ── Calculate fee ─────────────────────────────────────────────────────────
    const fee = calculateWithdrawalFee(amount);
    const totalDebit = amount + fee;

    const reference = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const description = `Withdrawal to ${bankName} - ${accountNumber}`;

    // ── Create withdrawal record (before debit so we have a record on failure) ─
    const { error: withdrawalError } = await supabase.from('withdrawals').insert({
      user_id: userId,
      amount,
      fee,
      net_amount: amount,
      bank_code: bankCode,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      reference,
      status: 'processing',
    });

    if (withdrawalError) {
      console.error('Create withdrawal error:', withdrawalError);
      return NextResponse.json(
        { error: `Failed to create withdrawal: ${withdrawalError.message}` },
        { status: 500 }
      );
    }

    // ── Step 1: Atomic debit via Core ─────────────────────────────────────────
    // Core enforces no-overdraft atomically — no need to pre-read balance here.
    // Core also creates the pending transaction record.
    try {
      await coreDebit({
        userId,
        amount: totalDebit,
        reference,
        serviceType: 'withdrawal',
        description,
        metadata: {
          bank_code: bankCode,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          fee,
          net_amount: amount,
        },
      });
    } catch (debitError) {
      // Roll back the withdrawal record
      await supabase.from('withdrawals').delete().eq('reference', reference);

      const msg = debitError instanceof Error ? debitError.message : 'Debit failed';
      if (msg.includes('insufficient funds')) {
        const balanceMatch = msg.match(/balance ([\d.]+)/);
        const bal = balanceMatch
          ? `₦${Number(balanceMatch[1]).toLocaleString()}`
          : 'insufficient';
        return NextResponse.json(
          { error: `Insufficient balance. You need ₦${totalDebit.toLocaleString()} (including ₦${fee} fee). Current balance: ${bal}` },
          { status: 400 }
        );
      }
      if (msg.includes('profile not found')) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      console.error('[WITHDRAWAL] Core debit failed:', debitError);
      return NextResponse.json(
        { error: 'Failed to debit balance. Please try again.' },
        { status: 500 }
      );
    }

    // ── Step 2: Initiate Flutterwave transfer ─────────────────────────────────
    try {
      console.log('[WITHDRAWAL] Initiating Flutterwave transfer:', reference);
      const transferResponse = await initiateTransfer({
        account_bank: bankCode,
        account_number: accountNumber,
        amount,
        narration: `TADA VTU Withdrawal - ${reference}`,
        reference,
        beneficiary_name: accountName,
      });

      if (transferResponse.status === 'success' && transferResponse.data) {
        await supabase
          .from('withdrawals')
          .update({
            flw_reference: transferResponse.data.reference,
            status: transferResponse.data.status === 'NEW' ? 'processing' : 'success',
          })
          .eq('reference', reference);

        if (transferResponse.data.status === 'SUCCESSFUL') {
          await supabase
            .from('transactions')
            .update({ status: 'success' })
            .eq('reference', reference);
        }

        return NextResponse.json({
          success: true,
          message: 'Withdrawal initiated successfully',
          reference,
          amount,
          fee,
          accountName,
          bankName,
        });
      }

      throw new Error(transferResponse.message || 'Transfer failed');
    } catch (transferError) {
      // ── Transfer failed — refund the user via Core ─────────────────────────
      const errorMessage = transferError instanceof Error ? transferError.message : 'Transfer failed';
      console.error('[WITHDRAWAL] Transfer error:', errorMessage);

      // Refund atomically via Core (idempotent)
      await coreRefund({
        userId,
        amount: totalDebit,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Withdrawal refund - ${reference}`,
      }).catch((e) => console.error('[WITHDRAWAL] Refund failed:', e));

      await supabase
        .from('withdrawals')
        .update({ status: 'failed', failure_reason: errorMessage })
        .eq('reference', reference);

      // Surface a user-friendly message
      let userMessage = 'Transfer failed. Your balance has been refunded.';
      if (errorMessage.includes('IP Whitelisting')) {
        userMessage = 'Withdrawal service temporarily unavailable. Please try again later.';
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        userMessage = 'Flutterwave balance insufficient. Please contact support.';
      }

      return NextResponse.json(
        { error: userMessage, details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[WITHDRAWAL] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
