import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

// PIN verification utility
function hashPin(pin: string): string {
  return Buffer.from(pin + 'tada_salt_2024').toString('base64');
}

function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Input validation
    const { dataRequestSchema, validateFormData } = await import('@/lib/validation');
    const validation = validateFormData(dataRequestSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { status: false, message: validation.errors?.[0] || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { network, phone, planId, amount, planName, userId, pin } = validation.data!;

    // Rate limiting
    const identifier = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = checkRateLimit(`data-vault:${identifier}`, RATE_LIMITS.transaction);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: false, message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const numAmount = amount;
    const supabase = getSupabaseAdmin();

    // Get user profile and balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, pin')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { status: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify transaction PIN
    if (!profile.pin) {
      return NextResponse.json(
        { status: false, message: 'Please set up your transaction PIN first' },
        { status: 400 }
      );
    }

    if (!pin) {
      return NextResponse.json(
        { status: false, message: 'Transaction PIN is required' },
        { status: 400 }
      );
    }

    if (!verifyPin(pin, profile.pin)) {
      return NextResponse.json(
        { status: false, message: 'Incorrect transaction PIN' },
        { status: 400 }
      );
    }

    // Check balance
    const currentBalance = profile.balance || 0;
    if (currentBalance < numAmount) {
      return NextResponse.json(
        { status: false, message: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Check if user already has a ready vault item for this phone+plan combination
    const { data: existingVault } = await supabase
      .from('data_vault')
      .select('id')
      .eq('user_id', userId)
      .eq('recipient_phone', phone)
      .eq('plan_id', planId)
      .eq('status', 'ready')
      .single();

    if (existingVault) {
      return NextResponse.json(
        { status: false, message: `You already have ${planName} parked for ${phone}. Deliver it first or choose a different plan.` },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = `VAULT_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Start transaction: Create transaction record first
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'data',
        amount: -numAmount,
        status: 'success', // Mark as success since we're parking it
        reference: reference,
        phone_number: phone,
        network: network.toUpperCase(),
        description: `Data Vault: ${network} ${planName} - ${phone}`,
      })
      .select()
      .single();

    if (txnError) {
      console.error('Transaction creation error:', txnError);
      return NextResponse.json(
        { status: false, message: 'Failed to create transaction. Please try again.' },
        { status: 500 }
      );
    }

    try {
      // Deduct balance immediately
      const newBalance = currentBalance - numAmount;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('Balance update error:', updateError);
        throw new Error('Failed to update balance');
      }

      // Create vault entry
      const { data: vaultItem, error: vaultError } = await supabase
        .from('data_vault')
        .insert({
          user_id: userId,
          network: network.toUpperCase(),
          plan_id: planId,
          plan_name: planName,
          amount: numAmount,
          recipient_phone: phone,
          status: 'ready',
          transaction_id: transaction.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (vaultError) {
        console.error('Vault creation error:', vaultError);
        
        // Rollback balance update
        await supabase
          .from('profiles')
          .update({ balance: currentBalance })
          .eq('id', userId);

        // Mark transaction as failed
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);

        throw new Error('Failed to create vault entry');
      }

      // Create wallet transaction record
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          type: 'debit',
          amount: numAmount,
          description: `Data Vault: ${planName} for ${phone}`,
          reference: reference,
          balance_before: currentBalance,
          balance_after: newBalance,
        });

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Data Parked Successfully',
          message: `${planName} has been parked for ${phone}. Tap to deliver when ready!`,
          type: 'success',
        });

      return NextResponse.json({
        status: true,
        message: `${planName} successfully parked for ${phone}!`,
        data: {
          vaultId: vaultItem.id,
          reference: transaction.reference,
          network,
          phone,
          planName,
          amount: numAmount,
          newBalance,
          expiresAt: vaultItem.expires_at,
        },
      });

    } catch (error) {
      console.error('[DATA-VAULT] Park error:', error);
      
      // Mark transaction as failed
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      return NextResponse.json(
        { status: false, message: 'Failed to park data. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[DATA-VAULT] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}