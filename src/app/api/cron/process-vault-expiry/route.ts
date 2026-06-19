import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseData as purchaseDataInlomax } from '@/lib/api/inlomax';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// Retry backoff schedule in minutes: attempt 1→5m, 2→15m, 3→60m, then fail
const RETRY_DELAYS = [5, 15, 60];

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    let scheduledDelivered = 0;
    let retriedDelivered = 0;
    let retryFailed = 0;

    // ── 1. Process expired vault items (existing) ──────────────────────────
    console.log('[CRON] Processing expired vault items...');
    const { data: expiryData, error: expiryError } = await supabase.rpc('process_expired_vault_items');
    if (expiryError) console.error('[CRON] Expiry error:', expiryError);
    const expiryResult = expiryData?.[0] || { processed_count: 0, error_count: 0 };

    // ── 2. Process scheduled deliveries (deliver_at <= now) ────────────────
    console.log('[CRON] Processing scheduled deliveries...');
    const { data: scheduled } = await supabase
      .from('data_vault')
      .select('*')
      .eq('status', 'ready')
      .not('deliver_at', 'is', null)
      .lte('deliver_at', now);

    for (const vault of scheduled || []) {
      try {
        const result = await purchaseDataInlomax({ serviceID: vault.plan_id, phone: vault.recipient_phone });
        if (result.status === 'success' || result.status === 'processing') {
          await supabase.from('data_vault').update({
            status: 'delivered',
            delivered_at: now,
            delivery_reference: result.data?.reference,
            updated_at: now,
          }).eq('id', vault.id);

          await supabase.from('notifications').insert({
            user_id: vault.user_id,
            title: 'Scheduled Data Delivered!',
            message: `${vault.plan_name} ${vault.network} was automatically delivered to ${vault.recipient_phone}`,
            type: 'success',
          });
          scheduledDelivered++;
        } else {
          // Failed — put into retry queue (retry_count=0, next_retry_at=5m from now)
          const nextRetry = new Date(Date.now() + RETRY_DELAYS[0] * 60 * 1000).toISOString();
          await supabase.from('data_vault').update({
            retry_count: 0,
            next_retry_at: nextRetry,
            updated_at: now,
          }).eq('id', vault.id);
        }
      } catch (err) {
        console.error('[CRON] Scheduled delivery error for vault', vault.id, err);
      }
    }

    // ── 3. Process smart retries ───────────────────────────────────────────
    console.log('[CRON] Processing smart retries...');
    const { data: retryVaults } = await supabase
      .from('data_vault')
      .select('*')
      .eq('status', 'ready')
      .not('next_retry_at', 'is', null)
      .lte('next_retry_at', now);

    for (const vault of retryVaults || []) {
      const retryCount = vault.retry_count ?? 0;
      try {
        const result = await purchaseDataInlomax({ serviceID: vault.plan_id, phone: vault.recipient_phone });
        if (result.status === 'success' || result.status === 'processing') {
          await supabase.from('data_vault').update({
            status: 'delivered',
            delivered_at: now,
            delivery_reference: result.data?.reference,
            retry_count: null,
            next_retry_at: null,
            updated_at: now,
          }).eq('id', vault.id);

          await supabase.from('notifications').insert({
            user_id: vault.user_id,
            title: 'Data Delivered (Retry Succeeded)',
            message: `${vault.plan_name} ${vault.network} was delivered to ${vault.recipient_phone} after retry`,
            type: 'success',
          });
          retriedDelivered++;
        } else {
          const nextAttempt = retryCount + 1;
          if (nextAttempt >= RETRY_DELAYS.length) {
            // All retries exhausted — notify user
            await supabase.from('data_vault').update({
              retry_count: nextAttempt,
              next_retry_at: null,
              updated_at: now,
            }).eq('id', vault.id);
            await supabase.from('notifications').insert({
              user_id: vault.user_id,
              title: 'Data Delivery Failed',
              message: `We couldn't deliver ${vault.plan_name} to ${vault.recipient_phone} after 3 attempts. Please try manually or request a refund.`,
              type: 'error',
            });
            retryFailed++;
          } else {
            const nextRetry = new Date(Date.now() + RETRY_DELAYS[nextAttempt] * 60 * 1000).toISOString();
            await supabase.from('data_vault').update({
              retry_count: nextAttempt,
              next_retry_at: nextRetry,
              updated_at: now,
            }).eq('id', vault.id);
          }
        }
      } catch (err) {
        console.error('[CRON] Retry error for vault', vault.id, err);
      }
    }

    // ── 4. QR expiry notifications (48h warning) ───────────────────────────
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { data: expiringQRs } = await supabase
      .from('vault_qr_codes')
      .select('*, data_vault!vault_qr_codes_vault_id_fkey(user_id, plan_name, network)')
      .is('used_at', null)
      .lte('expires_at', in48h)
      .gt('expires_at', now);

    for (const qr of expiringQRs || []) {
      const vault = qr.data_vault as any;
      if (!vault?.user_id) continue;
      // Only notify once — check if notification already sent today
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', vault.user_id)
        .ilike('message', `%${qr.id.slice(-8)}%`)
        .gte('created_at', `${today}T00:00:00Z`)
        .limit(1);

      if (!existing?.length) {
        await supabase.from('notifications').insert({
          user_id: vault.user_id,
          title: 'QR Code Expiring Soon',
          message: `Your ${vault.plan_name} ${vault.network} QR code (ID: ...${qr.id.slice(-8)}) expires in less than 48 hours. Extend or share it now.`,
          type: 'warning',
        });
      }
    }

    console.log(`[CRON] Done. Expired: ${expiryResult.processed_count}, Scheduled: ${scheduledDelivered}, Retried: ${retriedDelivered}, RetryFailed: ${retryFailed}`);

    return NextResponse.json({
      success: true,
      expiredProcessed: expiryResult.processed_count,
      scheduledDelivered,
      retriedDelivered,
      retryFailed,
      timestamp: now,
    });

  } catch (error) {
    console.error('[CRON] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}