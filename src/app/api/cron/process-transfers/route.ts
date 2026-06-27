import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BANK_TRANSFER_FEE } from '@/lib/api/flutterwave';
import { coreDeposit } from '@/lib/api/core';

// This endpoint polls Flutterwave for new bank transfers
// Call this every 2 minutes via cron job
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

async function flutterwaveRequest(endpoint: string) {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) throw new Error('FLUTTERWAVE_SECRET_KEY not configured');

  const response = await fetch(`https://api.flutterwave.com/v3${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret — same pattern as the other cron routes
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting transfer polling process...');

    const supabase = getSupabaseAdmin();

    // Get the last processed timestamp (or default to 1 hour ago)
    const { data: lastRun } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'last_transfer_poll')
      .single();

    const lastProcessed = lastRun?.value || new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    console.log('📅 Checking transfers since:', lastProcessed);

    // Get transactions from Flutterwave
    const fromDate = new Date(lastProcessed).toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    const flwResponse = await flutterwaveRequest(
      `/transactions?from=${fromDate}&to=${toDate}&payment_type=bank_transfer&status=successful`
    );

    if (flwResponse.status !== 'success') {
      console.error('❌ Failed to fetch transactions from Flutterwave:', flwResponse);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    const transactions = flwResponse.data || [];
    console.log(`📊 Found ${transactions.length} bank transfers from Flutterwave`);

    let processedCount = 0;

    for (const tx of transactions) {
      // Skip if transaction is older than our last processed time
      if (new Date(tx.created_at) <= new Date(lastProcessed)) {
        continue;
      }

      // Check if already processed (by webhook or previous poll)
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .or(`external_reference.eq.${tx.flw_ref},reference.eq.${tx.tx_ref}`)
        .single();

      if (existingTx) {
        console.log('⏭️  Transaction already processed:', tx.flw_ref);
        continue;
      }

      // Find user by virtual account or tx_ref
      let userId = null;

      // Method 1: Find by tx_ref pattern
      if (tx.tx_ref?.startsWith('TADA-VA-') || tx.tx_ref?.startsWith('TADA-TEMP-')) {
        const parts = tx.tx_ref.split('-');
        if (parts.length >= 3) {
          const userIdPrefix = parts[2];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .filter('id', 'like', `${userIdPrefix}%`)
            .limit(1);

          if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
          }
        }
      }

      // Method 2: Find by customer email (Highly reliable fallback)
      if (!userId && tx.customer?.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', tx.customer.email)
          .single();

        if (profile) {
          userId = profile.id;
        }
      }

      if (!userId) {
        console.log('❌ Could not identify user for transaction:', tx.flw_ref);
        continue;
      }

      // Get user's current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, referred_by')
        .eq('id', userId)
        .single();

      if (!profile) {
        console.log('❌ User not found:', userId);
        continue;
      }

      // Calculate wallet credit (deduct platform fee)
      // FIX: Dedcut fee correctly. Use Math.max(amount - fee, 0) to avoid negative credits
      const walletCredit = Math.max(tx.amount - BANK_TRANSFER_FEE, 0);

      // Credit wallet atomically via Core (handles idempotency, balance update, tx record, notification)
      const reference = `POLL-${Date.now()}-${tx.flw_ref.slice(-8)}`;
      try {
        await coreDeposit({
          userId,
          amount: tx.amount,
          walletCredit,
          fee: BANK_TRANSFER_FEE,
          reference,
          externalReference: tx.flw_ref,
          paymentType: 'bank_transfer',
          description: `Bank transfer (₦${BANK_TRANSFER_FEE} fee deducted)`,
          metadata: {
            flw_ref: tx.flw_ref,
            tx_ref: tx.tx_ref,
            customer_email: tx.customer?.email,
            processed_via: 'polling',
          },
        });
      } catch (depositError) {
        console.error('❌ Core deposit failed for transfer:', tx.flw_ref, depositError);
        continue;
      }

      console.log('✅ Processed transfer:', { userId: userId.slice(0, 8), amount: walletCredit, flwRef: tx.flw_ref });
      processedCount++;

      // Handle referral bonus (same logic as webhook)
      if (profile.referred_by) {
        const { data: existingBonus } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', profile.referred_by)
          .eq('type', 'deposit')
          .ilike('description', `%Referral bonus%${userId}%`)
          .single();

        if (!existingBonus) {
          const { count: depositCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'deposit')
            .eq('status', 'success');

          if (depositCount === 1) {
            const REFERRAL_BONUS = 100;

            const refBonusRef = `REF_BONUS_${Date.now()}_${userId.slice(0, 8)}`;
            try {
              await coreDeposit({
                userId: profile.referred_by,
                amount: REFERRAL_BONUS,
                walletCredit: REFERRAL_BONUS,
                fee: 0,
                reference: refBonusRef,
                externalReference: refBonusRef,
                paymentType: 'referral_bonus',
                description: `Referral bonus - ${userId.slice(0, 8)}`,
              });
            } catch (bonusError) {
              console.error('❌ Failed to credit referral bonus:', bonusError);
            }
          }
        }
      }
    }

    // Update last processed timestamp
    await supabase
      .from('system_settings')
      .upsert({
        key: 'last_transfer_poll',
        value: now,
        updated_at: now
      });

    console.log(`✅ Polling complete. Processed ${processedCount} new transfers.`);

    return NextResponse.json({
      status: 'success',
      processed: processedCount,
      checked_period: `${lastProcessed} to ${now}`,
      total_found: transactions.length
    });

  } catch (error) {
    console.error('❌ Transfer polling error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Polling failed', error: String(error) },
      { status: 500 }
    );
  }
}