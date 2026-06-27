import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { coreRefund } from '@/lib/api/core';

// Maximum age of a "pending" reconciliation entry before we auto-refund.
const MAX_PENDING_MINUTES = 15;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel injects this automatically for cron jobs).
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - MAX_PENDING_MINUTES * 60 * 1000).toISOString();

    // ── 1. Fetch all pending reconciliation entries ────────────────────────────
    const { data: entries, error: fetchError } = await supabase
      .from('reconciliation_entries')
      .select('id, account_id, kind, amount, request_id, status, created_at')
      .eq('status', 'pending');

    if (fetchError) {
      console.error('[CRON/reconcile] Error fetching entries:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending reconciliation entries',
        reconciled: 0,
        refunded: 0,
        failed: 0,
      });
    }

    console.log(`[CRON/reconcile] Processing ${entries.length} pending entries`);

    let reconciledCount = 0;
    let refundedCount = 0;
    let failedCount = 0;

    for (const entry of entries) {
      try {
        // ── 2. Look up corresponding transaction in Supabase ──────────────────
        const { data: txRows, error: txError } = await supabase
          .from('transactions')
          .select('id, status, reference, created_at')
          .eq('reference', entry.request_id)
          .limit(1);

        if (txError) {
          console.error(`[CRON/reconcile] TX lookup error for ${entry.id}:`, txError);
          failedCount++;
          continue;
        }

        const tx = txRows?.[0];

        // ── 3a. Transaction succeeded — mark reconciled ───────────────────────
        if (tx && tx.status === 'success') {
          const { error: updateError } = await supabase
            .from('reconciliation_entries')
            .update({ status: 'reconciled', updated_at: new Date().toISOString() })
            .eq('id', entry.id);

          if (updateError) {
            console.error(`[CRON/reconcile] Failed to reconcile ${entry.id}:`, updateError);
            failedCount++;
          } else {
            reconciledCount++;
            console.log(`[CRON/reconcile] Reconciled entry ${entry.id}`);
          }
          continue;
        }

        // ── 3b. Transaction failed — mark failed ─────────────────────────────
        if (tx && tx.status === 'failed') {
          await supabase
            .from('reconciliation_entries')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', entry.id);
          failedCount++;
          console.log(`[CRON/reconcile] Marked failed entry ${entry.id}`);
          continue;
        }

        // ── 3c. Stuck in pending > 15 min — trigger refund ───────────────────
        const isStuck = new Date(entry.created_at) < new Date(cutoff);
        if (isStuck) {
          const refundRef = `REFUND_RECON_${entry.request_id}`;
          await coreRefund({
            userId: entry.account_id,
            amount: entry.amount,
            reference: refundRef,
            originalReference: entry.request_id,
            description: `Auto-refund: reconciliation timeout (${entry.kind})`,
          });

          await supabase
            .from('reconciliation_entries')
            .update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq('id', entry.id);

          refundedCount++;
          console.log(
            `[CRON/reconcile] Refunded ₦${entry.amount} for stuck entry ${entry.id}`
          );
        }
        // Otherwise still within window — leave it pending for the next run.
      } catch (err) {
        console.error(`[CRON/reconcile] Unexpected error on entry ${entry.id}:`, err);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${entries.length} entries`,
      total: entries.length,
      reconciled: reconciledCount,
      refunded: refundedCount,
      failed: failedCount,
    });
  } catch (error) {
    console.error('[CRON/reconcile] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
