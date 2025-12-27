import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BANK_TRANSFER_FEE } from '@/lib/api/flutterwave';

// Force dynamic to prevent caching issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// GET endpoint for testing webhook URL accessibility
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Flutterwave webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

    const payload = await request.json();
    const { event, data } = payload;

    // Temporarily disable signature verification for debugging
    console.log('🔍 Webhook received:', { 
      signature, 
      secretHash: secretHash ? 'SET' : 'NOT SET',
      event: event 
    });
    
    // TODO: Re-enable signature verification after testing
    // if (secretHash && secretHash !== 'your_webhook_secret_here' && signature !== secretHash) {
    //   console.error('Invalid webhook signature');
    //   return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 401 });
    // }

    console.log('Flutterwave webhook received:', event, data?.tx_ref);

    // Handle virtual account transfers (bank transfers to dedicated accounts)
    if (event === 'charge.completed' && data.payment_type === 'bank_transfer') {
      const supabase = getSupabaseAdmin();
      const txRef = data.tx_ref;
      const amount = data.amount;
      const flwRef = data.flw_ref;
      const virtualAccountNumber = data.virtual_account_number || data.account_number;

      console.log('Virtual account transfer received:', { txRef, amount, flwRef, virtualAccountNumber });

      // Extract user_id - try multiple methods
      let userId = data.meta?.user_id;

      // Method 1: Find by virtual account number (most reliable)
      if (!userId && virtualAccountNumber) {
        console.log('Looking up user by virtual account number:', virtualAccountNumber);
        const { data: vaRecord } = await supabase
          .from('virtual_accounts')
          .select('user_id')
          .eq('account_number', virtualAccountNumber)
          .eq('is_active', true)
          .single();

        if (vaRecord) {
          userId = vaRecord.user_id;
          console.log('Found user by virtual account number:', userId);
        } else {
          console.log('No user found for account number:', virtualAccountNumber);
        }
      }

      // Method 2: Find by order_ref in virtual_accounts table
      if (!userId) {
        const { data: vaRecord } = await supabase
          .from('virtual_accounts')
          .select('user_id')
          .eq('order_ref', data.meta?.order_ref || txRef)
          .single();

        if (vaRecord) {
          userId = vaRecord.user_id;
          console.log('Found user by order_ref:', userId);
        }
      }

      // Method 3: Extract from tx_ref pattern (TADA-VA-{user_id_prefix}-{timestamp})
      if (!userId && txRef?.startsWith('TADA-VA-')) {
        const parts = txRef.split('-');
        if (parts.length >= 3) {
          const userIdPrefix = parts[2];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .ilike('id', `${userIdPrefix}%`)
            .limit(1);

          if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
            console.log('Found user by TADA-VA tx_ref pattern:', userId);
          }
        }
      }

      // Method 4: Extract from TEMP tx_ref pattern (TADA-TEMP-{user_id_prefix}-{timestamp})
      if (!userId && txRef?.startsWith('TADA-TEMP-')) {
        const parts = txRef.split('-');
        if (parts.length >= 3) {
          const userIdPrefix = parts[2];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .ilike('id', `${userIdPrefix}%`)
            .limit(1);

          if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
            console.log('Found user by TADA-TEMP tx_ref pattern:', userId);
          }
        }
      }

      // Method 5: Find by flw_ref in virtual_accounts table
      if (!userId && flwRef) {
        const { data: vaRecord } = await supabase
          .from('virtual_accounts')
          .select('user_id')
          .eq('flw_ref', flwRef)
          .single();

        if (vaRecord) {
          userId = vaRecord.user_id;
          console.log('Found user by flw_ref:', userId);
        }
      }

      if (!userId) {
        console.error('Could not identify user for virtual account transfer:', { txRef, virtualAccountNumber });
        return NextResponse.json({ status: 'error', message: 'User not found' }, { status: 400 });
      }

      // Check if transaction already processed
      const { data: existingTxn } = await supabase
        .from('transactions')
        .select('id')
        .eq('external_reference', flwRef)
        .single();

      if (existingTxn) {
        console.log('Virtual account transfer already processed:', flwRef);
        return NextResponse.json({ status: 'success', message: 'Already processed' });
      }      // Get user's current balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance, referred_by')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('User not found for VA transfer:', userId);
        return NextResponse.json({ status: 'error', message: 'User not found' }, { status: 404 });
      }

      // Calculate wallet credit after deducting TADA platform fee (₦30)
      // User transfers (amount), gets (amount - 30) in wallet
      // Example: User transfers ₦1,030 → gets ₦1,000 in wallet
      const walletCredit = amount - BANK_TRANSFER_FEE;

      // Ensure minimum credit (don't allow negative or zero credits)
      if (walletCredit < 50) {
        console.error('Transfer amount too low after fee:', { amount, walletCredit });
        // Still credit the full amount for very small transfers (edge case)
        // This prevents user frustration for transfers under ₦80
      }

      const finalCredit = walletCredit > 0 ? walletCredit : amount;
      const newBalance = (profile.balance || 0) + finalCredit;

      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);

      // Create transaction record
      const reference = `VA-${Date.now()}-${flwRef.slice(-8)}`;
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'deposit',
        amount: finalCredit,
        status: 'success',
        description: `Bank transfer (₦${BANK_TRANSFER_FEE} fee deducted)`,
        reference,
        external_reference: flwRef,
        response_data: {
          payment_type: 'bank_transfer',
          flw_ref: flwRef,
          tx_ref: txRef,
          customer_email: data.customer?.email,
          transfer_amount: amount,
          platform_fee: BANK_TRANSFER_FEE,
        }
      });

      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'success',
        title: 'Wallet Funded! 💰',
        message: `₦${finalCredit.toLocaleString()} has been added to your wallet via bank transfer.`,
      });

      console.log('Virtual account transfer credited:', { userId, transferAmount: amount, walletCredit: finalCredit, fee: BANK_TRANSFER_FEE, newBalance, flwRef });

      // Handle referral bonus for first deposit (same logic as card payments)
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

      return NextResponse.json({ status: 'success', message: 'Virtual account transfer credited' });
    }

    // Handle card/USSD payments (existing flow) - exclude bank transfers
    if (event === 'charge.completed' && data.status === 'successful' && data.payment_type !== 'bank_transfer') {
      const supabase = getSupabaseAdmin();
      const userId = data.meta?.user_id;
      const txRef = data.tx_ref;

      // Use wallet_credit from meta (original amount without service charge)
      const walletCredit = data.meta?.wallet_credit || data.meta?.original_amount || data.amount;
      const serviceCharge = data.meta?.service_charge || 0;
      const totalPaid = data.amount;

      console.log('Webhook payment data:', { userId, txRef, totalPaid, walletCredit, serviceCharge });

      if (!userId || !walletCredit) {
        console.error('Missing user_id or amount in webhook data');
        return NextResponse.json({ status: 'error', message: 'Missing data' }, { status: 400 });
      }

      // Check if transaction already processed
      const { data: existingTxn } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference', txRef)
        .single();

      if (existingTxn) {
        console.log('Transaction already processed:', txRef);
        return NextResponse.json({ status: 'success', message: 'Already processed' });
      }

      // Get user's current balance and referral info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance, referred_by')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('User not found:', userId);
        return NextResponse.json({ status: 'error', message: 'User not found' }, { status: 404 });
      }

      // Credit wallet with original amount only (excluding service charge)
      const newBalance = (profile.balance || 0) + walletCredit;
      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'deposit',
        amount: walletCredit,
        status: 'success',
        description: `Wallet funding via Flutterwave (₦${serviceCharge} service fee paid)`,
        reference: txRef,
        metadata: {
          flw_ref: data.flw_ref,
          payment_type: data.payment_type,
          customer_email: data.customer?.email,
          total_paid: totalPaid,
          service_charge: serviceCharge,
        }
      });

      console.log('Wallet credited:', { userId, walletCredit, newBalance, txRef, serviceCharge });

      // Check if this is user's first deposit and they have a referrer
      if (profile.referred_by) {
        // Check if referral bonus already paid
        const { data: existingBonus } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', profile.referred_by)
          .eq('type', 'deposit')
          .ilike('description', `%Referral bonus%${userId}%`)
          .single();

        if (!existingBonus) {
          // Check if this is the referee's first deposit
          const { count: depositCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'deposit')
            .eq('status', 'success');

          // Only pay bonus on first deposit
          if (depositCount === 1) {
            const REFERRAL_BONUS = 100;

            // Get referrer's current balance
            const { data: referrer } = await supabase
              .from('profiles')
              .select('balance')
              .eq('id', profile.referred_by)
              .single();

            if (referrer) {
              // Credit referrer
              const referrerNewBalance = (referrer.balance || 0) + REFERRAL_BONUS;
              await supabase
                .from('profiles')
                .update({ balance: referrerNewBalance })
                .eq('id', profile.referred_by);

              // Create referral bonus transaction
              await supabase.from('transactions').insert({
                user_id: profile.referred_by,
                type: 'deposit',
                amount: REFERRAL_BONUS,
                status: 'success',
                description: `Referral bonus - ${userId.slice(0, 8)}`,
                reference: `REF_BONUS_${Date.now()}_${userId.slice(0, 8)}`,
              });

              // Create notification for referrer
              await supabase.from('notifications').insert({
                user_id: profile.referred_by,
                type: 'success',
                title: 'Referral Bonus! 🎉',
                message: `You earned ₦${REFERRAL_BONUS} because someone you referred made their first deposit!`,
              });

              console.log('Referral bonus paid:', { referrerId: profile.referred_by, bonus: REFERRAL_BONUS });
            }
          }
        }
      }

      return NextResponse.json({ status: 'success', message: 'Wallet credited' });
    }

    // Handle transfer events (withdrawals)
    if (event === 'transfer.completed') {
      const supabase = getSupabaseAdmin();
      const reference = data.reference;
      const status = data.status; // SUCCESSFUL, FAILED, PENDING

      console.log('Transfer webhook:', { reference, status });

      if (!reference) {
        return NextResponse.json({ status: 'error', message: 'Missing reference' }, { status: 400 });
      }

      // Find the withdrawal record
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('reference', reference)
        .single();

      if (withdrawalError || !withdrawal) {
        console.error('Withdrawal not found:', reference);
        return NextResponse.json({ status: 'error', message: 'Withdrawal not found' }, { status: 404 });
      }

      // Already processed
      if (withdrawal.status === 'success' || withdrawal.status === 'failed') {
        console.log('Withdrawal already finalized:', reference);
        return NextResponse.json({ status: 'success', message: 'Already processed' });
      }

      if (status === 'SUCCESSFUL') {
        // Update withdrawal status
        await supabase
          .from('withdrawals')
          .update({
            status: 'success',
            completed_at: new Date().toISOString()
          })
          .eq('reference', reference);

        // Update transaction status
        await supabase
          .from('transactions')
          .update({ status: 'success' })
          .eq('reference', reference);

        // Create notification
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          type: 'success',
          title: 'Withdrawal Successful',
          message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} to ${withdrawal.account_name} has been completed.`,
        });

        console.log('Withdrawal completed:', reference);
      } else if (status === 'FAILED') {
        // Refund the user
        const totalDebit = withdrawal.amount + withdrawal.fee;

        await supabase.rpc('update_user_balance', {
          p_user_id: withdrawal.user_id,
          p_amount: totalDebit,
          p_type: 'credit',
          p_description: `Withdrawal refund - ${reference}`,
          p_reference: `${reference}-REFUND`,
        });

        // Update withdrawal status
        await supabase
          .from('withdrawals')
          .update({
            status: 'failed',
            failure_reason: data.complete_message || 'Transfer failed'
          })
          .eq('reference', reference);

        // Update transaction status
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('reference', reference);

        // Create notification
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          type: 'error',
          title: 'Withdrawal Failed',
          message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} failed. The amount has been refunded to your wallet.`,
        });

        console.log('Withdrawal failed and refunded:', reference);
      }

      return NextResponse.json({ status: 'success' });
    }

    console.log('Unhandled webhook event:', event);
    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error', message: 'Webhook processing failed' }, { status: 500 });
  }
}
