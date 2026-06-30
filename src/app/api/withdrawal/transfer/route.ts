import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { initiateTransfer, getTransferFee, getPayoutBalance } from '@/lib/api/flutterwave-transfer';
import { coreDebit, coreRefund } from '@/lib/api/core';
import { checkRateLimit } from '@/lib/rate-limiter';

const MIN_WITHDRAWAL     = 100;
const MAX_WITHDRAWAL     = 500_000;
const DAILY_MAX_COUNT    = 3;
const DAILY_MAX_AMOUNT   = 200_000;
const FLW_BALANCE_BUFFER = 10_000;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createSupabaseClient(url, key);
}

const LEGACY_SALT = 'tada_salt_2024';

function legacyHash(pin: string): string {
  return Buffer.from(pin + LEGACY_SALT).toString('base64');
}

async function verifyAndMaybeRehashPin(
  pin: string,
  storedHash: string,
  userId: string,
  adminSupabase: ReturnType<typeof getSupabaseAdmin>
): Promise<boolean> {
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(pin, storedHash);
  }

  if (legacyHash(pin) !== storedHash) return false;

  try {
    const newHash = await bcrypt.hash(pin, 12);
    await adminSupabase
      .from('profiles')
      .update({ pin: newHash })
      .eq('id', userId);
    console.log(`[WITHDRAWAL] PIN migrated to bcrypt for user ${userId}`);
  } catch (e) {
    console.error('[WITHDRAWAL] bcrypt migration failed (non-blocking):', e);
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const rateCheck = checkRateLimit(`withdrawal:${user.id}`);
    if (!rateCheck.allowed) {
      return NextResponse.json({
        status: 'error',
        message: `Too many attempts. Please wait ${rateCheck.retryAfter} seconds.`,
      }, { status: 429 });
    }

    const { bankCode, bankName, accountNumber, accountName, amount, pin } = await request.json();

    if (!bankCode || !accountNumber || !accountName || !amount) {
      return NextResponse.json({ status: 'error', message: 'All fields are required' }, { status: 400 });
    }
    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ status: 'error', message: 'Please enter your 4-digit PIN' }, { status: 400 });
    }

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount < MIN_WITHDRAWAL) {
      return NextResponse.json({
        status: 'error',
        message: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}`,
      }, { status: 400 });
    }
    if (withdrawalAmount > MAX_WITHDRAWAL) {
      return NextResponse.json({
        status: 'error',
        message: `Maximum withdrawal is ₦${MAX_WITHDRAWAL.toLocaleString()}`,
      }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();

    let transferFee: number;
    try {
      transferFee = await getTransferFee(withdrawalAmount);
    } catch {
      if (withdrawalAmount <= 5000) transferFee = 10.75;
      else if (withdrawalAmount <= 50000) transferFee = 26.88;
      else transferFee = 53.75;
    }

    const totalDebit  = withdrawalAmount + transferFee;

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

    const pinValid = await verifyAndMaybeRehashPin(String(pin), profile.pin, user.id, adminSupabase);
    if (!pinValid) {
      return NextResponse.json({ status: 'error', message: 'Invalid transaction PIN' }, { status: 401 });
    }

    const { data: withdrawableData, error: withdrawableError } = await adminSupabase
      .rpc('get_withdrawable_balance', { p_user_id: user.id });

    if (withdrawableError) {
      console.error('[WITHDRAWAL] get_withdrawable_balance error:', withdrawableError);
      return NextResponse.json({ status: 'error', message: 'Could not verify balance. Please try again.' }, { status: 500 });
    }

    if ((withdrawableData as number) < totalDebit) {
      return NextResponse.json({
        status: 'error',
        message: `Insufficient withdrawable balance. You need ₦${totalDebit.toLocaleString()} (₦${withdrawalAmount.toLocaleString()} + ₦${transferFee.toLocaleString()} fee). Some funds may be in a 3-day hold period.`,
      }, { status: 400 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayWithdrawals, error: dailyError } = await adminSupabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', user.id)
      .neq('status', 'failed')
      .gte('created_at', todayStart.toISOString());

    if (dailyError) {
      console.error('[WITHDRAWAL] daily limit query error:', dailyError);
    } else {
      const dailyCount  = todayWithdrawals?.length ?? 0;
      const dailyTotal  = todayWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) ?? 0;

      if (dailyCount >= DAILY_MAX_COUNT) {
        return NextResponse.json({
          status: 'error',
          message: `Daily withdrawal limit reached (${DAILY_MAX_COUNT} withdrawals per day). Try again tomorrow.`,
        }, { status: 429 });
      }

      if (dailyTotal + withdrawalAmount > DAILY_MAX_AMOUNT) {
        const remaining = DAILY_MAX_AMOUNT - dailyTotal;
        return NextResponse.json({
          status: 'error',
          message: `Daily amount limit reached. You can withdraw up to ₦${remaining.toLocaleString()} more today.`,
        }, { status: 429 });
      }
    }

    const flwBalance = await getPayoutBalance();
    if (flwBalance !== null && flwBalance < withdrawalAmount + FLW_BALANCE_BUFFER) {
      console.warn(`[WITHDRAWAL] FLW balance low: ₦${flwBalance} < ₦${withdrawalAmount + FLW_BALANCE_BUFFER}`);
      return NextResponse.json({
        status: 'error',
        message: 'Withdrawal service is temporarily at capacity. Please try again in a few hours or contact support.',
      }, { status: 503 });
    }

    const reference  = `TADA-WD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const description = `Withdrawal to ${accountName} (${accountNumber})`;

    const { error: withdrawalError } = await adminSupabase.from('withdrawals').insert({
      user_id:        user.id,
      amount:         withdrawalAmount,
      fee:            transferFee,
      net_amount:     withdrawalAmount - transferFee,
      account_number: accountNumber,
      account_name:   accountName,
      bank_code:      bankCode,
      bank_name:      bankName || 'Bank',
      status:         'processing',
      reference,
    });

    if (withdrawalError) {
      console.error('[WITHDRAWAL] record insert failed:', withdrawalError);
      return NextResponse.json({
        status: 'error',
        message: `Failed to create withdrawal record: ${withdrawalError.message}`,
      }, { status: 500 });
    }

    try {
      await coreDebit({
        userId:      user.id,
        amount:      totalDebit,
        reference,
        serviceType: 'withdrawal',
        description,
        metadata: {
          bank_code:      bankCode,
          bank_name:      bankName,
          account_number: accountNumber,
          account_name:   accountName,
          fee:            transferFee,
          net_amount:     withdrawalAmount - transferFee,
        },
      });
    } catch (debitError) {
      await adminSupabase.from('withdrawals').delete().eq('reference', reference);

      const msg = debitError instanceof Error ? debitError.message : 'Debit failed';
      if (msg.includes('insufficient funds')) {
        return NextResponse.json({
          status: 'error',
          message: 'Insufficient balance. Please try a smaller amount.',
        }, { status: 400 });
      }
      console.error('[WITHDRAWAL] coreDebit failed:', debitError);
      return NextResponse.json({ status: 'error', message: 'Failed to process withdrawal. Please try again.' }, { status: 500 });
    }

    try {
      const transferResult = await initiateTransfer({
        bankCode,
        accountNumber,
        accountName,
        amount:     withdrawalAmount,
        reference,
        userId:     user.id,
        narration:  `TADA VTU Withdrawal - ${reference}`,
      });

      if (!transferResult.success) throw new Error(transferResult.message || 'Transfer failed');

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
        type:    'info',
        title:   'Withdrawal Processing',
        message: `Your withdrawal of ₦${withdrawalAmount.toLocaleString()} to ${accountName} is being processed.`,
      });

      return NextResponse.json({
        status:  'success',
        message: 'Withdrawal initiated successfully',
        data: {
          reference:     transferResult.reference,
          amount:        withdrawalAmount,
          fee:           transferFee,
          netAmount:     withdrawalAmount - transferFee,
          totalDebit,
          accountName,
          accountNumber,
          status:        transferResult.status,
        },
      });

    } catch (transferError) {
      const errorMessage = transferError instanceof Error ? transferError.message : 'Transfer failed';
      console.error('[WITHDRAWAL] transfer error:', errorMessage);

      try {
        await coreRefund({
          userId:            user.id,
          amount:            totalDebit,
          reference:         `REFUND_${reference}`,
          originalReference: reference,
          description:       `Withdrawal refund - ${reference}`,
        });
      } catch (refundError) {
        console.error(
          '[WITHDRAWAL] ⚠️ MANUAL ACTION REQUIRED — refund failed after transfer failure.',
          { reference, userId: user.id, totalDebit, errorMessage, refundError }
        );
        try {
          await adminSupabase.from('failed_refunds').insert({
            user_id:            user.id,
            amount:             totalDebit,
            original_reference: reference,
            refund_reference:   `REFUND_${reference}`,
            description:        `Withdrawal refund - ${reference}`,
            source:             'withdrawal',
            last_error:         refundError instanceof Error ? refundError.message : String(refundError),
          });
        } catch (queueError) {
          console.error('[WITHDRAWAL] Could not enqueue failed_refunds row (non-blocking):', queueError);
        }
        return NextResponse.json({
          status:  'error',
          message: 'Transfer failed and the automatic refund could not be completed. Support has been alerted — reference: ' + reference,
        }, { status: 502 });
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
    console.error('[WITHDRAWAL] Unexpected error:', error);
    return NextResponse.json({
      status:  'error',
      message: error instanceof Error ? error.message : 'Withdrawal failed',
    }, { status: 500 });
  }
}
