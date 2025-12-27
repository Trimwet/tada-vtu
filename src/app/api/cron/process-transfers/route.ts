import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BANK_TRANSFER_FEE } from '@/lib/api/flutterwave';

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
            .ilike('id', `${userIdPrefix}%`)
            .limit(1);

          if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
          }
        }
      }

      // Method 2: Find by customer email
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
      const walletCredit = Math.max(tx.amount - BANK_TRANSFER_FEE, tx.amount);
      const newBalance = (profile.balance || 0) + walletCredit;

      // Update balance
      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);

      // Create transaction record
      const reference = `POLL-${Date.now()}-${tx.flw_ref.slice(-8)}`;
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'deposit',
        amount: walletCredit,
        status: 'success',
        description: `Bank transfer (₦${BANK_TRANSFER_FEE} fee deducted)`,
        reference,
        external_reference: tx.flw_ref,
        response_data: {
          payment_type: 'bank_transfer',
          flw_ref: tx.flw_ref,
          tx_ref: tx.tx_ref,
          customer_email: tx.customer?.email,
          transfer_amount: tx.amount,
          platform_fee: BANK_TRANSFER_FEE,
          processed_via: 'polling',
        }
      });

      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'success',
        title: 'Wallet Funded! 💰',
        message: `₦${walletCredit.toLocaleString()} has been added to your wallet via bank transfer.`,
      });

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
            const { data: referrer } = await supabase
              .from('profiles')
              .select('balance')
              .eq('id', profile.referred_by)
              .single();

            if (referrer) {
              const referrerNewBalance = (referrer.balance || 0) + REFERRAL_BONUS;
              await supabase
                .from('profiles')
                .update({ balance: referrerNewBalance })
                .eq('id', profile.referred_by);

              await supabase.from('transactions').insert({
                user_id: profile.referred_by,
                type: 'deposit',
                amount: REFERRAL_BONUS,
                status: 'success',
                description: `Referral bonus - ${userId.slice(0, 8)}`,
                reference: `REF_BONUS_${Date.now()}_${userId.slice(0, 8)}`,
              });

              await supabase.from('notifications').insert({
                user_id: profile.referred_by,
                type: 'success',
                title: 'Referral Bonus! 🎉',
                message: `You earned ₦${REFERRAL_BONUS} because someone you referred made their first deposit!`,
              });
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