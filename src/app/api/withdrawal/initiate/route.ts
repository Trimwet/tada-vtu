import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { initiateTransfer, calculateWithdrawalFee } from '@/lib/api/flutterwave';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MIN_WITHDRAWAL = 500; // Minimum ₦500
const MAX_WITHDRAWAL = 50000; // Maximum ₦50,000 per transaction

// Simple PIN hash (matches the one used in auth routes)
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
      pin 
    } = await request.json();

    // Validate required fields
    if (!userId || !amount || !bankCode || !accountNumber || !accountName || !pin) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate amount
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

    // Get user profile and verify PIN
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, balance, pin')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify PIN
    if (!profile.pin) {
      return NextResponse.json(
        { error: 'Please set up your transaction PIN first' },
        { status: 400 }
      );
    }

    const isPinValid = verifyPin(pin, profile.pin);
    if (!isPinValid) {
      return NextResponse.json(
        { error: 'Invalid transaction PIN' },
        { status: 401 }
      );
    }

    // Calculate fee and check balance
    const fee = calculateWithdrawalFee(amount);
    const totalDebit = amount + fee;

    if (profile.balance < totalDebit) {
      return NextResponse.json(
        { error: `Insufficient balance. You need ₦${totalDebit.toLocaleString()} (including ₦${fee} fee)` },
        { status: 400 }
      );
    }

    // Generate reference
    const reference = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create withdrawal record
    const { error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
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
      console.error('Create withdrawal error:', JSON.stringify(withdrawalError, null, 2));
      return NextResponse.json(
        { error: `Failed to create withdrawal: ${withdrawalError.message}` },
        { status: 500 }
      );
    }

    console.log('Withdrawal record created:', reference);

    // Debit user balance
    console.log('Debiting balance:', { userId, totalDebit });
    const { error: balanceError } = await supabase.rpc('update_user_balance', {
      p_user_id: userId,
      p_amount: totalDebit,
      p_type: 'debit',
      p_description: `Withdrawal to ${bankName} - ${accountNumber}`,
      p_reference: reference,
    });

    if (balanceError) {
      // Rollback withdrawal record
      await supabase.from('withdrawals').delete().eq('reference', reference);
      console.error('Balance debit error:', JSON.stringify(balanceError, null, 2));
      return NextResponse.json(
        { error: `Failed to debit balance: ${balanceError.message}` },
        { status: 500 }
      );
    }

    console.log('Balance debited successfully');

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'withdrawal',
      amount: -totalDebit,
      status: 'pending',
      reference,
      description: `Withdrawal to ${accountName} (${bankName})`,
    });

    // Initiate transfer via Flutterwave
    console.log('Initiating Flutterwave transfer...');
    try {
      const transferResponse = await initiateTransfer({
        account_bank: bankCode,
        account_number: accountNumber,
        amount,
        narration: `TADA VTU Withdrawal - ${reference}`,
        reference,
        beneficiary_name: accountName,
      });

      if (transferResponse.status === 'success' && transferResponse.data) {
        // Update withdrawal with Flutterwave reference
        await supabase
          .from('withdrawals')
          .update({ 
            flw_reference: transferResponse.data.reference,
            status: transferResponse.data.status === 'NEW' ? 'processing' : 'success'
          })
          .eq('reference', reference);

        // Update transaction status
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
      } else {
        throw new Error(transferResponse.message || 'Transfer failed');
      }
    } catch (transferError) {
      // Transfer failed - refund user
      const errorMessage = transferError instanceof Error ? transferError.message : 'Transfer failed';
      console.error('Transfer error:', errorMessage);
      
      await supabase.rpc('update_user_balance', {
        p_user_id: userId,
        p_amount: totalDebit,
        p_type: 'credit',
        p_description: `Withdrawal refund - ${reference}`,
        p_reference: `${reference}-REFUND`,
      });

      await supabase
        .from('withdrawals')
        .update({ 
          status: 'failed',
          failure_reason: errorMessage
        })
        .eq('reference', reference);

      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('reference', reference);

      // Return specific error message to user
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
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
