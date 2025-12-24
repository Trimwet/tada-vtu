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
    const supabase = await createClient();

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

    // ----------------------------------------------------------------------
    // ATOMIC TRANSACTION START
    // ----------------------------------------------------------------------
    // We use the database RPC to check balance and deduct atomically.
    // This prevents race conditions where two withdrawals could happen at once.
    const { data: debitResult, error: debitError } = await supabase
      .rpc('atomic_wallet_update', {
        p_user_id: user.id,
        p_amount: -transferAmount, // Negative for debit
        p_description: `Bank Transfer to ${accountName} (${accountNumber})`,
        p_reference: `WD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        p_type: 'withdrawal',
        p_metadata: { bankCode, accountNumber, accountName }
      });

    if (debitError) {
      console.error('Debit error:', debitError);
      return NextResponse.json(
        { status: 'error', message: debitError.message || 'Insufficient balance or transaction failed' },
        { status: 400 }
      );
    }

    // Debit successful
    const { new_balance, transaction_id } = debitResult as any;
    // ----------------------------------------------------------------------


    try {
      // Execute the bank transfer via SMEPlug
      const result = await bankTransfer({
        bankCode,
        accountNumber,
        accountName,
        amount: transferAmount,
        userId: user.id,
      });

      // Update transaction with result
      await supabase
        .from('transactions')
        .update({
          status: result.success ? 'success' : 'failed',
          reference: result.reference || debitResult.transaction_id, // Use API ref if available, else generic
          external_reference: result.reference
        } as never)
        .eq('id', transaction_id);

      if (!result.success) {
        // ----------------------------------------------------------------------
        // ROLLBACK / REFUND
        // ----------------------------------------------------------------------
        console.error('Transfer API failed, refunding user:', result.message);

        // Refund the user atomically
        await supabase.rpc('atomic_wallet_update', {
          p_user_id: user.id,
          p_amount: transferAmount, // Positive to add back
          p_description: `Refund: Failed transfer to ${accountNumber}`,
          p_reference: `REFUND-${transaction_id}`,
          p_type: 'deposit' // Or 'refund' if supported
        });

        return NextResponse.json(
          { status: 'error', message: result.message || 'Transfer failed. Your wallet has been refunded.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        status: 'success',
        message: 'Transfer initiated successfully',
        data: {
          reference: result.reference,
          amount: transferAmount,
          accountName,
          accountNumber,
          newBalance: new_balance, // From the atomic update
        },
      });

    } catch (transferError) {
      // ----------------------------------------------------------------------
      // ROLLBACK / REFUND ON EXCEPTION
      // ----------------------------------------------------------------------
      console.error('Transfer Logic Error, refunding:', transferError);

      await supabase.rpc('atomic_wallet_update', {
        p_user_id: user.id,
        p_amount: transferAmount,
        p_description: `Refund: System error during transfer to ${accountNumber}`,
        p_reference: `REFUND-ERR-${transaction_id}`,
        p_type: 'deposit'
      });

      // Update tx status
      await supabase
        .from('transactions')
        .update({ status: 'failed' } as never)
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
