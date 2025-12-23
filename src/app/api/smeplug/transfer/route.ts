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

    const currentBalance = profile.balance || 0;
    
    // Check if user has enough balance (no fees for SMEPlug transfers!)
    if (currentBalance < transferAmount) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}` 
        },
        { status: 400 }
      );
    }

    // Deduct from user's balance first (SMEPlug has ZERO fees!)
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ balance: currentBalance - transferAmount } as never)
      .eq('id', user.id);

    if (deductError) {
      return NextResponse.json(
        { status: 'error', message: 'Failed to process withdrawal' },
        { status: 500 }
      );
    }

    // Create pending transaction record
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: -transferAmount,
        status: 'pending',
        description: `Bank Transfer to ${accountName} (${accountNumber})`,
      } as never)
      .select()
      .single();

    if (txnError || !transaction) {
      // Refund the balance
      await supabase
        .from('profiles')
        .update({ balance: currentBalance } as never)
        .eq('id', user.id);
      
      return NextResponse.json(
        { status: 'error', message: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    const txnId = (transaction as { id: string }).id;

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
          reference: result.reference,
        } as never)
        .eq('id', txnId);

      if (!result.success) {
        // Refund on failure
        await supabase
          .from('profiles')
          .update({ balance: currentBalance } as never)
          .eq('id', user.id);

        return NextResponse.json(
          { status: 'error', message: result.message || 'Transfer failed' },
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
          newBalance: currentBalance - transferAmount,
        },
      });
    } catch (transferError) {
      // Refund on error
      await supabase
        .from('profiles')
        .update({ balance: currentBalance } as never)
        .eq('id', user.id);

      // Update transaction as failed
      await supabase
        .from('transactions')
        .update({ status: 'failed' } as never)
        .eq('id', txnId);

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
