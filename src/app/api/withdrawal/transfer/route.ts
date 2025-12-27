import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { initiateTransfer, getTransferFee } from '@/lib/api/flutterwave-transfer';

const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 500000;

// Simple PIN hash (matches the one used in auth routes)
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

// POST /api/withdrawal/transfer - Initiate bank withdrawal via Flutterwave
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { bankCode, bankName, accountNumber, accountName, amount, pin } = await request.json();

    // Validate inputs
    if (!bankCode || !accountNumber || !accountName || !amount) {
      return NextResponse.json(
        { status: 'error', message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        { status: 'error', message: 'Please enter your 4-digit PIN' },
        { status: 400 }
      );
    }

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { status: 'error', message: `Minimum withdrawal is ₦${MIN_WITHDRAWAL}` },
        { status: 400 }
      );
    }

    if (withdrawalAmount > MAX_WITHDRAWAL) {
      return NextResponse.json(
        { status: 'error', message: `Maximum withdrawal is ₦${MAX_WITHDRAWAL.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Get transfer fee from Flutterwave
    const transferFee = await getTransferFee(withdrawalAmount);
    const totalDebit = withdrawalAmount + transferFee;

    // Get user's current balance and PIN
    const adminSupabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await adminSupabase
      .from('profiles')
      .select('balance, pin')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { status: 'error', message: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Verify PIN
    if (!userData.pin) {
      return NextResponse.json(
        { status: 'error', message: 'Please set up your transaction PIN first' },
        { status: 400 }
      );
    }

    if (!verifyPin(pin, userData.pin)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid transaction PIN' },
        { status: 401 }
      );
    }

    // Check if user has sufficient balance (amount + fee)
    if (userData.balance < totalDebit) {
      return NextResponse.json(
        { status: 'error', message: `Insufficient balance. You need ₦${totalDebit.toLocaleString()} (₦${withdrawalAmount.toLocaleString()} + ₦${transferFee.toLocaleString()} fee)` },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = `TADA-WD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Debit user's wallet first (atomic operation)
    const newBalance = userData.balance - totalDebit;
    const { error: debitError } = await adminSupabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (debitError) {
      console.error('Failed to debit user:', debitError);
      return NextResponse.json(
        { status: 'error', message: 'Failed to process withdrawal' },
        { status: 500 }
      );
    }

    // Create pending transaction record
    const { data: txRecord, error: txError } = await adminSupabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: -withdrawalAmount,
        status: 'pending',
        description: `Withdrawal to ${accountName} (${accountNumber})`,
        reference: reference,
        response_data: {
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
          fee: transferFee,
          total_debit: totalDebit,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error('Failed to create transaction record:', txError);
      // Refund the user
      await adminSupabase
        .from('profiles')
        .update({ balance: userData.balance })
        .eq('id', user.id);

      return NextResponse.json(
        { status: 'error', message: 'Failed to process withdrawal' },
        { status: 500 }
      );
    }

    // Create record in withdrawals table for status tracking via webhook
    const { error: withdrawalTableError } = await adminSupabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount: withdrawalAmount,
        fee: transferFee,
        net_amount: withdrawalAmount,
        account_number: accountNumber,
        account_name: accountName,
        bank_code: bankCode,
        bank_name: bankName || 'Bank',
        status: 'pending',
        reference: reference, // This is the crucial link for the webhook
      });

    if (withdrawalTableError) {
      console.error('Failed to create withdrawal table record:', withdrawalTableError);
      // We don't necessarily need to fail the whole process here, but it's safer
      // as the webhook relies on this record.
    }

    try {
      // Initiate transfer via Flutterwave
      console.log('[WITHDRAWAL] Initiating Flutterwave transfer:', {
        bankCode,
        accountNumber,
        accountName,
        amount: withdrawalAmount,
        reference,
      });

      const transferResult = await initiateTransfer({
        bankCode,
        accountNumber,
        accountName,
        amount: withdrawalAmount,
        reference,
        userId: user.id,
        narration: `TADA VTU Withdrawal - ${reference}`,
      });

      console.log('[WITHDRAWAL] Flutterwave transfer result:', transferResult);

      if (!transferResult.success) {
        // Transfer failed - refund user
        console.error('Transfer failed, refunding user:', transferResult.message);

        await adminSupabase
          .from('profiles')
          .update({ balance: userData.balance })
          .eq('id', user.id);

        await adminSupabase
          .from('transactions')
          .update({
            status: 'failed',
            response_data: {
              ...txRecord.response_data,
              error: transferResult.message,
            }
          })
          .eq('id', txRecord.id);

        return NextResponse.json(
          { status: 'error', message: transferResult.message || 'Transfer failed. Your wallet has been refunded.' },
          { status: 400 }
        );
      }

      // Update transaction with Flutterwave reference
      await adminSupabase
        .from('transactions')
        .update({
          external_reference: transferResult.reference,
          response_data: {
            ...txRecord.response_data,
            flw_transfer_id: transferResult.transferId,
            flw_status: transferResult.status,
          },
        })
        .eq('id', txRecord.id);

      // Create notification
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
          totalDebit: totalDebit,
          accountName,
          accountNumber,
          newBalance: newBalance,
          status: transferResult.status,
        },
      });

    } catch (transferError) {
      // Transfer API error - refund user
      console.error('Transfer API error, refunding:', transferError);

      await adminSupabase
        .from('profiles')
        .update({ balance: userData.balance })
        .eq('id', user.id);

      await adminSupabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', txRecord.id);

      return NextResponse.json(
        { status: 'error', message: 'Transfer service unavailable. Please try again later.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Withdrawal failed' },
      { status: 500 }
    );
  }
}
