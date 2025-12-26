import { NextRequest, NextResponse } from 'next/server';
import { bankTransfer } from '@/lib/api/provider-router';
import { createClient } from '@/lib/supabase/server';

const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 500000;

// Simple PIN hash (matches the one used in auth routes)
function hashPin(pin: string): string {
  return Buffer.from(pin + 'tada_salt_2024').toString('base64');
}

function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

// POST /api/smeplug/transfer - Initiate bank transfer withdrawal via SMEPlug (ZERO FEES!)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { bankCode, accountNumber, accountName, amount, pin } = await request.json();

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

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { status: 'error', message: `Minimum withdrawal is ₦${MIN_WITHDRAWAL}` },
        { status: 400 }
      );
    }

    if (transferAmount > MAX_WITHDRAWAL) {
      return NextResponse.json(
        { status: 'error', message: `Maximum withdrawal is ₦${MAX_WITHDRAWAL.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Get user's current balance and PIN
    const { data: userData, error: userError } = await supabase
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
    const profile = userData as { balance: number; pin: string | null };
    if (!profile.pin) {
      return NextResponse.json(
        { status: 'error', message: 'Please set up your transaction PIN first' },
        { status: 400 }
      );
    }

    if (!verifyPin(pin, profile.pin)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid transaction PIN' },
        { status: 401 }
      );
    }

    // Check if user has sufficient balance
    if (profile.balance < transferAmount) {
      return NextResponse.json(
        { status: 'error', message: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Generate unique reference and description for this transaction
    const reference = `WD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const description = `Bank Transfer to ${accountName} (${accountNumber})`;

    // Use NEW atomic initiate_withdrawal RPC
    // This handles debiting the user AND creating the pending transaction record in one atomic step
    const { data: initData, error: initError } = await supabase.rpc('initiate_withdrawal', {
      p_user_id: user.id,
      p_amount: transferAmount,
      p_bank_code: bankCode,
      p_account_number: accountNumber,
      p_account_name: accountName,
      p_reference: reference,
      p_description: description
    });

    if (initError || !initData?.success) {
      console.error('Withdrawal initiation error:', initError || initData?.message);
      return NextResponse.json(
        { status: 'error', message: initData?.message || 'Failed to initiate withdrawal' },
        { status: 400 }
      );
    }

    const { transaction_id } = initData;
    // ----------------------------------------------------------------------


    try {
      // Execute the bank transfer via SMEPlug
      console.log('[TRANSFER] Initiating SMEPlug transfer:', {
        bankCode,
        accountNumber,
        accountName,
        amount: transferAmount,
        reference
      });

      const result = await bankTransfer({
        bankCode,
        accountNumber,
        accountName,
        amount: transferAmount,
        userId: user.id,
      });

      console.log('[TRANSFER] SMEPlug transfer result:', result);

      // Update transaction with result
      await supabase
        .from('transactions')
        .update({
          status: result.success ? 'success' : 'failed',
          reference: result.reference || transaction_id, // Use API ref if available, else our tx id
          external_reference: result.reference
        })
        .eq('id', transaction_id);

      if (!result.success) {
        // ----------------------------------------------------------------------
        // ROLLBACK / REFUND
        // ----------------------------------------------------------------------
        console.error('Transfer API failed, refunding user:', result.message);

        // Refund the user using existing function
        await supabase.rpc('update_user_balance', {
          p_user_id: user.id,
          p_amount: transferAmount,
          p_type: 'credit',
          p_description: `Refund: Failed transfer to ${accountNumber}`,
          p_reference: `REFUND-${reference}`
        } as never);

        return NextResponse.json(
          { status: 'error', message: result.message || 'Transfer failed. Your wallet has been refunded.' },
          { status: 400 }
        );
      }

      // Get updated balance for response
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      return NextResponse.json({
        status: 'success',
        message: 'Transfer initiated successfully',
        data: {
          reference: result.reference,
          amount: transferAmount,
          accountName,
          accountNumber,
          newBalance: updatedProfile?.balance || 0,
        },
      });

    } catch (transferError) {
      // ----------------------------------------------------------------------
      // ROLLBACK / REFUND ON EXCEPTION
      // ----------------------------------------------------------------------
      console.error('Transfer Logic Error, refunding:', transferError);

      await supabase.rpc('update_user_balance', {
        p_user_id: user.id,
        p_amount: transferAmount,
        p_type: 'credit',
        p_description: `Refund: System error during transfer to ${accountNumber}`,
        p_reference: `REFUND-ERR-${reference}`
      } as never);

      // Update tx status
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction_id);

      throw transferError;
    }
  } catch (error) {
    console.error('Bank transfer error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Transfer failed',
      },
      { status: 500 }
    );
  }
}
