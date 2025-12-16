import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (secretHash && secretHash !== 'your_webhook_secret_here' && signature !== secretHash) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 401 });
    }

    const payload = await request.json();
    const { event, data } = payload;

    console.log('Flutterwave webhook received:', event, data?.tx_ref);

    if (event === 'charge.completed' && data.status === 'successful') {
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
