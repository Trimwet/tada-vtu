import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createSupabaseClient(url, serviceKey);
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
    const supabaseClient = await createClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

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

    // Security check: Verify userId matches authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ status: false, message: 'Unauthorized: User ID mismatch' }, { status: 401 });
    }

    // Optional scheduling / escrow fields
    const deliverAt: string | null = body.deliverAt || null;
    const freezeUntil: string | null = body.freezeUntil || null;
    const lockedToPhone: string | null = body.lockedToPhone || null;

    // Validate dates if provided
    const now = new Date();
    if (deliverAt) {
      const deliverDate = new Date(deliverAt);
      if (isNaN(deliverDate.getTime())) {
        return NextResponse.json({ status: false, message: 'Invalid delivery date' }, { status: 400 });
      }
      if (deliverDate < now) {
        return NextResponse.json({ status: false, message: 'Delivery date must be in the future' }, { status: 400 });
      }
      // Max 30 days in future
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (deliverDate > thirtyDays) {
        return NextResponse.json({ status: false, message: 'Delivery date cannot be more than 30 days in the future' }, { status: 400 });
      }
    }

    if (freezeUntil) {
      const freezeDate = new Date(freezeUntil);
      if (isNaN(freezeDate.getTime())) {
        return NextResponse.json({ status: false, message: 'Invalid freeze date' }, { status: 400 });
      }
      if (freezeDate < now) {
        return NextResponse.json({ status: false, message: 'Freeze date must be in the future' }, { status: 400 });
      }
    }

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

    // Generate unique reference
    const reference = `VAULT_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create transaction record first
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'data',
        amount: -numAmount,
        status: 'success',
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
      // Use RPC function for atomic park operation
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('park_data_vault', {
          p_user_id: userId,
          p_network: network.toUpperCase(),
          p_plan_id: planId,
          p_plan_name: planName,
          p_amount: numAmount,
          p_recipient_phone: phone,
          p_transaction_id: transaction.id,
          p_deliver_at: deliverAt,
          p_freeze_until: freezeUntil,
          p_occasion_tag: body.occasionTag || null,
        });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        
        // Mark transaction as failed
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);

        return NextResponse.json(
          { status: false, message: 'Failed to park data. Please try again.' },
          { status: 400 }
        );
      }

      const result = rpcResult?.[0] as { success: boolean; message: string; vault_id: string; new_balance: number } | undefined;
      if (!result?.success) {
        // Mark transaction as failed
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);

        return NextResponse.json(
          { status: false, message: result?.message || 'Failed to park data.' },
          { status: 400 }
        );
      }

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
          vaultId: result.vault_id,
          reference: transaction.reference,
          network,
          phone,
          planName,
          amount: numAmount,
          newBalance: result.new_balance,
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