/**
 * GET /api/cron/retry-failed-refunds
 *
 * Retries coreRefund() for any unresolved row in failed_refunds.
 * Runs daily. Secured by CRON_SECRET.
 *
 * On success: marks the row resolved.
 * On repeat failure: increments attempts + updates last_error, leaves
 * row in the queue. After 5 attempts, logs a loud warning for manual
 * follow-up but does NOT stop retrying (money is still owed to the user).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { coreRefund } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createClient(url, key);
}

const MAX_ATTEMPTS_BEFORE_LOUD_WARNING = 5;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: pending, error } = await supabase
      .from('failed_refunds')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[CRON/retry-refunds] Query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let resolvedCount = 0;
    let stillFailingCount = 0;

    for (const row of pending ?? []) {
      try {
        await coreRefund({
          userId:             row.user_id,
          amount:             Number(row.amount),
          reference:          `${row.refund_reference}-RETRY-${row.attempts + 1}`,
          originalReference:  row.original_reference,
          description:        row.description || `Retry refund - ${row.original_reference}`,
        });

        await supabase
          .from('failed_refunds')
          .update({ resolved: true, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', row.id);

        await supabase.from('notifications').insert({
          user_id: row.user_id,
          type:    'success',
          title:   'Refund Completed',
          message: `Your refund of ₦${Number(row.amount).toLocaleString()} has been processed.`,
        });

        resolvedCount++;
      } catch (retryError) {
        stillFailingCount++;
        const newAttempts = row.attempts + 1;
        const errMsg = retryError instanceof Error ? retryError.message : String(retryError);

        await supabase
          .from('failed_refunds')
          .update({
            attempts:   newAttempts,
            last_error: errMsg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        if (newAttempts >= MAX_ATTEMPTS_BEFORE_LOUD_WARNING) {
          console.error(
            `[CRON/retry-refunds] 🚨 PERSISTENT FAILURE after ${newAttempts} attempts — needs manual review:`,
            { id: row.id, userId: row.user_id, amount: row.amount, originalReference: row.original_reference, errMsg }
          );
        }
      }
    }

    console.log(`[CRON/retry-refunds] resolved=${resolvedCount} still_failing=${stillFailingCount}`);
    return NextResponse.json({ success: true, resolved: resolvedCount, stillFailing: stillFailingCount });
  } catch (err) {
    console.error('[CRON/retry-refunds] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}
