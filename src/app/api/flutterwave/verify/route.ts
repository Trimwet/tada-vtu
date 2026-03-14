import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction, verifyTransactionByRef } from '@/lib/api/flutterwave';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transaction_id = searchParams.get('transaction_id');
    const tx_ref = searchParams.get('tx_ref');

    if (!transaction_id && !tx_ref) {
      return NextResponse.json(
        { status: 'error', message: 'transaction_id or tx_ref is required' },
        { status: 400 }
      );
    }

    let result;
    if (transaction_id) {
      result = await verifyTransaction(transaction_id);
    } else if (tx_ref) {
      result = await verifyTransactionByRef(tx_ref);
    }

    if (result?.data?.status === 'successful') {
      const supabase = getSupabaseAdmin();
      const txRef = result.data.tx_ref;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = (result.data as any).meta || {};
      const userId = meta.user_id;

      // Use the original amount (wallet_credit) from meta, not the total charged amount
      // This ensures we only credit what the user intended to fund, not including service charge
      const walletCredit = meta.wallet_credit || meta.original_amount || result.data.amount;
      const serviceCharge = meta.service_charge || 0;

      console.log('Payment verification:', {
        txRef,
        totalPaid: result.data.amount,
        walletCredit,
        serviceCharge,
        userId
      });

      // Check if transaction already processed
      const { data: existingTxn } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference', txRef)
        .single();

      if (!existingTxn && userId) {
        // Transaction not yet processed - credit the wallet with original amount only
        console.log('Crediting wallet via verify endpoint:', { userId, walletCredit, txRef });

        // Get user's current balance and referral info
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('balance, referred_by')
          .eq('id', userId)
          .single();

        if (!profileError && profile) {
          // Credit wallet with original amount (excluding service charge)
          // ATOMIC UPDATE: Use RPC to safely add balance
          const { data: creditResult, error: creditError } = await supabase
            .rpc('atomic_wallet_update', {
              p_user_id: userId,
              p_amount: walletCredit, // Positive for credit
              p_description: `Wallet funding via Flutterwave (₦${serviceCharge} service fee paid)`,
              p_reference: txRef,
              p_type: 'deposit',
              p_metadata: {
                flutterwave_ref: result.data.flw_ref,
                service_charge: serviceCharge,
                total_paid: result.data.amount
              }
            });

          if (creditError) {
            console.error('Failed to credit wallet atomically:', creditError);
            throw new Error('Database error during wallet credit');
          }

          const { new_balance } = creditResult as any;

          console.log('Wallet credited successfully:', { userId, walletCredit, new_balance, serviceCharge });

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
                const REFERRAL_POINTS = 100;
                const bonusRef = `REF_POINTS_${profile.referred_by.slice(0, 8)}_${userId.slice(0, 8)}`;

                // Atomic upsert — prevents duplicate bonus if two requests race
                const { error: bonusError } = await supabase
                  .from('transactions')
                  .upsert({
                    user_id: profile.referred_by,
                    type: 'deposit',
                    amount: REFERRAL_POINTS,
                    status: 'success',
                    description: `Referral points earned - ${userId.slice(0, 8)}`,
                    reference: bonusRef,
                  }, { onConflict: 'reference', ignoreDuplicates: true });

                if (!bonusError) {
                  // Only update profile if transaction was actually inserted
                  await supabase.rpc('increment_referral_stats', {
                    p_user_id: profile.referred_by,
                    p_points: REFERRAL_POINTS,
                  }).catch(() => {
                    // Fallback if RPC doesn't exist
                    supabase.from('profiles').update({
                      referral_points: supabase.rpc('coalesce_add', { col: 'referral_points', val: REFERRAL_POINTS }),
                    }).eq('id', profile.referred_by);
                  });

                  await supabase.from('notifications').insert({
                    user_id: profile.referred_by,
                    type: 'success',
                    title: 'Referral Points Earned! 🎉',
                    message: `You earned ${REFERRAL_POINTS} points because someone you referred made their first deposit!`,
                  }).then(() => {
                    console.log('Referral points awarded:', { referrerId: profile.referred_by, points: REFERRAL_POINTS });
                  });
                }
              }
            }
          }
        }
      }

      return NextResponse.json({
        status: 'success',
        message: 'Transaction verified and wallet credited',
        data: {
          amount: walletCredit, // Return the amount credited to wallet
          total_paid: result.data.amount,
          service_charge: serviceCharge,
          currency: result.data.currency,
          tx_ref: result.data.tx_ref,
          flw_ref: result.data.flw_ref,
          status: result.data.status,
          customer: result.data.customer,
        },
      });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Transaction not successful',
      data: result?.data,
    });
  } catch (error) {
    console.error('Flutterwave verify error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
}
