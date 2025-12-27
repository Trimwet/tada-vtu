import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { BANK_TRANSFER_FEE } from '@/lib/api/flutterwave';
import { processDeposit } from '@/lib/api/deposit-processor';

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
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getSupabaseAdmin();
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ status: 'error', message: 'Payment configuration error' }, { status: 500 });
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
    if (flwData.status !== 'success' || !flwData.data) {
      return NextResponse.json({ status: 'success', message: 'No new transfers found.', processed: 0 });
    }

    const transactions = flwData.data;
    let processedCount = 0;

    for (const tx of transactions) {
      // Find user by tx_ref or email
      let userId = null;

      // Logic to resolve userId from tx_ref
      if (tx.tx_ref?.startsWith('TADA-VA-') || tx.tx_ref?.startsWith('TADA-TEMP-')) {
        const parts = tx.tx_ref.split('-');
        const prefix = parts[2];
        const { data: profiles } = await adminSupabase.from('profiles').select('id').ilike('id', `${prefix}%`).limit(1);
        if (profiles?.[0]) userId = profiles[0].id;
      }

      // Fallback: Check customer email
      if (!userId && tx.customer?.email) {
        const { data: profile } = await adminSupabase.from('profiles').select('id').eq('email', tx.customer.email).single();
        if (profile) userId = profile.id;
      }

      if (!userId) {
        console.warn(`[MANUAL-CHECK] Could not identify user for transaction ${tx.flw_ref}`);
        continue;
      }

      // Use the centralized processor
      const result = await processDeposit(adminSupabase, {
        userId,
        amount: tx.amount,
        walletCredit: Math.max(tx.amount - BANK_TRANSFER_FEE, 0),
        fee: BANK_TRANSFER_FEE,
        reference: tx.tx_ref || `MANUAL-${tx.flw_ref}`,
        externalReference: tx.flw_ref,
        paymentType: 'bank_transfer',
        description: `Bank transfer (₦${BANK_TRANSFER_FEE} fee detected via manual check)`,
        metadata: { flw_id: tx.id }
      });

      if (result.success && !result.alreadyProcessed) {
        processedCount++;
      }
    }

    return NextResponse.json({
      status: 'success',
      message: processedCount > 0
        ? `Found and processed ${processedCount} new transfers!`
        : 'All deposits are already up to date.',
      processed: processedCount
    });

  } catch (error) {
    console.error('Manual check error:', error);
    return NextResponse.json({ status: 'error', message: 'Check failed index error.' }, { status: 500 });
  }
}
