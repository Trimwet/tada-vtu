import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!;
const SERVICE_FEE = 50;

async function verifyWithFlutterwave(txRef: string) {
  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`,
      { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET}` } }
    );
    return await response.json();
  } catch (error) {
    return { status: 'error', message: String(error) };
  }
}

async function creditUserWallet(userId: string, amount: number, txRef: string, flwRef: string) {
  const netAmount = amount - SERVICE_FEE;
  
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .or(`reference.eq.${txRef},external_reference.eq.${flwRef}`)
    .single();

  if (existing) return { success: false, reason: 'already_credited' };

  const { error: txError } = await supabase.from('transactions').insert({
    user_id: userId,
    type: 'deposit',
    amount: netAmount,
    status: 'success',
    reference: txRef,
    external_reference: flwRef,
    description: `Wallet funding via Flutterwave (₦${SERVICE_FEE} service fee) - Auto-verified`
  });

  if (txError) return { success: false, reason: txError.message };

  const { error: balError } = await supabase.rpc('increment_balance', {
    user_id: userId,
    amount: netAmount
  });

  if (balError) {
    await supabase.from('profiles')
      .update({ balance: supabase.rpc('', {}) })
      .eq('id', userId);
    
    await supabase.from('profiles')
      .update({ balance: netAmount })
      .eq('id', userId);
  }

  return { success: true, amount: netAmount };
}


export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { checked: 0, credited: 0, errors: [] as string[] };

  try {
    // Get pending payments that haven't been credited
    const { data: pendingPayments } = await supabase
      .from('pending_payments')
      .select('*')
      .eq('status', 'pending')
      .lt('verification_attempts', 5)
      .order('created_at', { ascending: true })
      .limit(10);

    if (!pendingPayments?.length) {
      return NextResponse.json({ message: 'No pending payments', ...results });
    }

    for (const payment of pendingPayments) {
      results.checked++;
      
      // Update attempt count
      await supabase
        .from('pending_payments')
        .update({ 
          verification_attempts: payment.verification_attempts + 1,
          last_verified_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      // Verify with Flutterwave
      const verification = await verifyWithFlutterwave(payment.tx_ref);
      
      if (verification.status === 'success' && verification.data?.status === 'successful') {
        const flwData = verification.data;
        
        // Find user by email
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', flwData.customer?.email)
          .single();

        if (user) {
          const creditResult = await creditUserWallet(
            user.id,
            flwData.amount,
            payment.tx_ref,
            flwData.flw_ref
          );

          if (creditResult.success) {
            await supabase
              .from('pending_payments')
              .update({ status: 'credited', credited_at: new Date().toISOString() })
              .eq('id', payment.id);
            results.credited++;
          } else if (creditResult.reason === 'already_credited') {
            await supabase
              .from('pending_payments')
              .update({ status: 'credited' })
              .eq('id', payment.id);
          }
        }
      } else if (verification.data?.status === 'failed') {
        await supabase
          .from('pending_payments')
          .update({ status: 'failed' })
          .eq('id', payment.id);
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Payment verification cron error:', error);
    return NextResponse.json({ error: String(error), ...results }, { status: 500 });
  }
}
