import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { BANK_TRANSFER_FEE } from '@/lib/api/flutterwave';

// Manual trigger for checking transfers
// Users can click a button to check immediately
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createSupabaseClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to check for transfers directly
    const adminSupabase = getSupabaseAdmin();
    
    // Get recent transactions from Flutterwave API
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { status: 'error', message: 'Payment configuration error' },
        { status: 500 }
      );
    }

    // Get today's date for the query
    const today = new Date().toISOString().split('T')[0];
    
    const flwResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions?from=${today}&to=${today}&payment_type=bank_transfer&status=successful`,
      {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const flwData = await flwResponse.json();
    
    if (flwData.status !== 'success') {
      return NextResponse.json({
        status: 'success',
        message: 'No new transfers found. All deposits are up to date.',
        processed: 0
      });
    }

    const transactions = flwData.data || [];
    let processedCount = 0;

    for (const tx of transactions) {
      // Check if already processed
      const { data: existingTx } = await adminSupabase
        .from('transactions')
        .select('id')
        .eq('external_reference', tx.flw_ref)
        .single();

      if (existingTx) continue;

      // Find user by tx_ref or email
      let userId = null;

      if (tx.tx_ref?.startsWith('TADA-VA-') || tx.tx_ref?.startsWith('TADA-TEMP-')) {
        const parts = tx.tx_ref.split('-');
        if (parts.length >= 3) {
          const userIdPrefix = parts[2];
          const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('id')
            .ilike('id', `${userIdPrefix}%`)
            .limit(1);

          if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
          }
        }
      }

      if (!userId && tx.customer?.email) {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('email', tx.customer.email)
          .single();

        if (profile) userId = profile.id;
      }

      if (!userId) continue;

      // Get user's current balance
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();

      if (!profile) continue;

      // Calculate wallet credit
      const walletCredit = Math.max(tx.amount - BANK_TRANSFER_FEE, 0);
      const newBalance = (profile.balance || 0) + walletCredit;

      // Update balance
      await adminSupabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);

      // Create transaction record
      const reference = `MANUAL-${Date.now()}-${tx.flw_ref.slice(-8)}`;
      await adminSupabase.from('transactions').insert({
        user_id: userId,
        type: 'deposit',
        amount: walletCredit,
        status: 'success',
        description: `Bank transfer (₦${BANK_TRANSFER_FEE} fee deducted)`,
        reference,
        external_reference: tx.flw_ref,
      });

      // Create notification
      await adminSupabase.from('notifications').insert({
        user_id: userId,
        type: 'success',
        title: 'Wallet Funded! 💰',
        message: `₦${walletCredit.toLocaleString()} has been added to your wallet.`,
      });

      processedCount++;
    }

    return NextResponse.json({
      status: 'success',
      message: processedCount > 0 
        ? `Found and processed ${processedCount} new transfers!`
        : 'No new transfers found. All deposits are up to date.',
      processed: processedCount
    });

  } catch (error) {
    console.error('Manual check error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Check failed. Please try again.' },
      { status: 500 }
    );
  }
}