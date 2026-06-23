import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { coreRefund } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Find pending VTU transactions older than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, description, reference, phone_number, network')
      .eq('status', 'pending')
      .in('type', ['airtime', 'data', 'cable', 'electricity'])
      .lt('created_at', tenMinutesAgo);

    if (fetchError) {
      console.error('[CRON] Error fetching pending transactions:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!pendingTransactions || pendingTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck pending transactions found',
        processed: 0,
      });
    }

    console.log(`[CRON] Found ${pendingTransactions.length} stuck pending transactions`);

    let refundedCount = 0;
    let skippedCount = 0;
    let refundedAmount = 0;

    for (const transaction of pendingTransactions) {
      try {
        const refundAmount = Math.abs(transaction.amount);
        const refundRef = `REFUND_${transaction.reference}`;

        // coreRefund is idempotent: it checks TransactionExists(refundRef) before
        // doing anything. If this cron runs twice concurrently, the second call
        // finds the refund record already inserted and returns success without
        // double-crediting. No raw RPC call needed.
        await coreRefund({
          userId: transaction.user_id,
          amount: refundAmount,
          reference: refundRef,
          originalReference: transaction.reference,
          description: `Refund: ${transaction.description || transaction.type} (Timeout)`,
        });

        refundedCount++;
        refundedAmount += refundAmount;
        console.log(`[CRON] Refunded ₦${refundAmount} to user ${transaction.user_id} for ref ${transaction.reference}`);
      } catch (error) {
        // coreRefund already handles: idempotency, balance credit, tx record, notification.
        // If it throws here it's a network/Core error; log and skip — don't retry in this run.
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('alreadyProcessed') || msg.includes('idempotent')) {
          skippedCount++;
        } else {
          console.error(`[CRON] Refund failed for transaction ${transaction.reference}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${refundedCount} stuck transactions`,
      processed: refundedCount,
      skipped: skippedCount,
      totalRefunded: refundedAmount,
      found: pendingTransactions.length,
    });
  } catch (error) {
    console.error('[CRON] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
