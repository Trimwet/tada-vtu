import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Find pending transactions older than 10 minutes
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

    let failedCount = 0;
    let refundedAmount = 0;

    // Process each stuck transaction
    for (const transaction of pendingTransactions) {
      try {
        // Mark transaction as failed
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);

        if (updateError) {
          console.error(`[CRON] Failed to update transaction ${transaction.id}:`, updateError);
          continue;
        }

        // Refund the user using RPC function
        const refundAmount = Math.abs(transaction.amount);
        const { error: refundError } = await supabase.rpc('update_user_balance', {
          p_user_id: transaction.user_id,
          p_amount: refundAmount,
          p_type: 'credit',
          p_description: `Refund: ${transaction.description || transaction.type} (Timeout)`
        });

        if (refundError) {
          console.error(`[CRON] Failed to refund user ${transaction.user_id}:`, refundError);
          continue;
        }

        failedCount++;
        refundedAmount += refundAmount;

        console.log(`[CRON] Refunded ₦${refundAmount} to user ${transaction.user_id} for transaction ${transaction.reference}`);
      } catch (error) {
        console.error(`[CRON] Error processing transaction ${transaction.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${failedCount} stuck transactions`,
      processed: failedCount,
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
