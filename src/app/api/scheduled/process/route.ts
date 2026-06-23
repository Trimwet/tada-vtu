import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseAirtime, purchaseData, ServiceUnavailableError } from '@/lib/api/inlomax';
import { coreDebit, coreRefund } from '@/lib/api/core';
import { calculateNextRun, calculateRetryTime } from '@/lib/scheduled-purchases';
import type { ScheduleFrequency } from '@/types/database';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// POST — Process due scheduled purchases (called by cron job)
// Vercel Cron: { "crons": [{ "path": "/api/scheduled/process", "schedule": "*/15 * * * *" }] }
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const results: Array<{ id: string; status: string; message: string }> = [];

    // Fetch schedules due within the next 5 minutes
    const toleranceTime = new Date(now.getTime() + 5 * 60 * 1000);
    const { data: dueSchedules, error: fetchError } = await supabase
      .from('scheduled_purchases')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', toleranceTime.toISOString())
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
      .limit(50);

    if (fetchError) {
      console.error('[CRON] Error fetching due schedules:', fetchError);
      return NextResponse.json({ status: false, message: 'Failed to fetch schedules' }, { status: 500 });
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return NextResponse.json({ status: true, message: 'No schedules due', processed: 0 });
    }

    console.log(`[CRON] Processing ${dueSchedules.length} scheduled purchases`);

    for (const schedule of dueSchedules) {
      const reference = `SCHED_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const description = `Scheduled ${schedule.service_type} ₦${schedule.amount} → ${schedule.recipient_phone}`;

      try {
        // ── Step 1: Atomic debit via Core ──────────────────────────────────────
        // Core enforces no-overdraft atomically — no need to pre-read the balance.
        // Core creates the pending transaction record and returns the error if funds
        // are insufficient (message will contain "insufficient funds").
        try {
          await coreDebit({
            userId: schedule.user_id,
            amount: schedule.amount,
            reference,
            serviceType: schedule.service_type,
            description,
            metadata: {
              schedule_id: schedule.id,
              network: schedule.network,
              phone_number: schedule.recipient_phone,
              data_plan_id: schedule.data_plan_id,
            },
          });
        } catch (debitError) {
          const msg = debitError instanceof Error ? debitError.message : '';
          if (msg.includes('insufficient funds')) {
            await handleInsufficientBalance(supabase, schedule);
            results.push({ id: schedule.id, status: 'insufficient_balance', message: 'Insufficient balance' });
          } else if (msg.includes('profile not found')) {
            await logScheduleExecution(supabase, schedule, 'failed', 'User not found');
            results.push({ id: schedule.id, status: 'failed', message: 'User not found' });
          } else {
            console.error(`[CRON] Core debit failed for schedule ${schedule.id}:`, debitError);
            await handleFailedPurchase(supabase, schedule, 'Payment processing error');
            results.push({ id: schedule.id, status: 'failed', message: 'Payment processing error' });
          }
          continue;
        }

        // ── Step 2: Call VTU provider ──────────────────────────────────────────
        let purchaseResult: { status: string; message: string; data?: { reference?: string } };

        switch (schedule.service_type) {
          case 'airtime':
            purchaseResult = await purchaseAirtime({
              network: schedule.network!,
              phone: schedule.recipient_phone!,
              amount: schedule.amount,
            });
            break;
          case 'data':
            purchaseResult = await purchaseData({
              serviceID: schedule.data_plan_id!,
              phone: schedule.recipient_phone!,
            });
            break;
          // TODO: cable and electricity
          default:
            purchaseResult = { status: 'failed', message: 'Unsupported service type' };
        }

        // ── Step 3: Handle provider outcome ───────────────────────────────────
        if (purchaseResult.status === 'success') {
          // Update the pending tx Core created, then advance the schedule
          await supabase
            .from('transactions')
            .update({
              status: 'success',
              external_reference: purchaseResult.data?.reference,
            })
            .eq('reference', reference);

          await handleSuccessfulSchedule(supabase, schedule);
          results.push({ id: schedule.id, status: 'success', message: 'Purchase completed' });

        } else if (purchaseResult.status === 'processing') {
          await logScheduleExecution(supabase, schedule, 'success', 'Processing', purchaseResult.data?.reference);
          results.push({ id: schedule.id, status: 'processing', message: 'Purchase processing' });

        } else {
          // Provider returned failure — refund via Core
          await coreRefund({
            userId: schedule.user_id,
            amount: schedule.amount,
            reference: `REFUND_${reference}`,
            originalReference: reference,
            description: `Refund: ${description}`,
          }).catch((e) => console.error(`[CRON] Refund failed for ${schedule.id}:`, e));

          await handleFailedPurchase(supabase, schedule, purchaseResult.message);
          results.push({ id: schedule.id, status: 'failed', message: purchaseResult.message });
        }

      } catch (error) {
        console.error(`[CRON] Error processing schedule ${schedule.id}:`, error);

        // Attempt refund — if the debit succeeded but something else blew up
        await coreRefund({
          userId: schedule.user_id,
          amount: schedule.amount,
          reference: `REFUND_${reference}`,
          originalReference: reference,
          description: `Refund: ${description} (unexpected error)`,
        }).catch(() => {}); // Best-effort; Core is idempotent so safe to call

        if (error instanceof ServiceUnavailableError) {
          await handleServiceUnavailable(supabase, schedule);
          results.push({ id: schedule.id, status: 'service_unavailable', message: 'Service unavailable' });
        } else {
          await handleFailedPurchase(supabase, schedule, 'Unexpected error');
          results.push({ id: schedule.id, status: 'failed', message: 'Unexpected error' });
        }
      }
    }

    return NextResponse.json({
      status: true,
      message: `Processed ${results.length} schedules`,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('[CRON] Scheduled process error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}

// ── Schedule lifecycle helpers ────────────────────────────────────────────────

/** Advance schedule to its next run after a successful purchase. */
async function handleSuccessfulSchedule(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  schedule: Record<string, unknown>
) {
  const nextRun = calculateNextRun(
    schedule.frequency as ScheduleFrequency,
    schedule.custom_days as number[] | null,
    schedule.preferred_time as string
  );

  await supabase
    .from('scheduled_purchases')
    .update({
      last_run_at: new Date().toISOString(),
      last_status: 'success',
      last_error: null,
      next_run_at: nextRun.toISOString(),
      retry_count: 0,
      success_count: (schedule.success_count as number) + 1,
      total_spent: (schedule.total_spent as number) + (schedule.amount as number),
    })
    .eq('id', schedule.id);

  await logScheduleExecution(supabase, schedule, 'success', 'Purchase completed');

  if (schedule.notify_on_success) {
    await supabase.from('notifications').insert({
      user_id: schedule.user_id,
      title: '✅ Scheduled Purchase Complete',
      message: `Your scheduled ${schedule.service_type} of ₦${schedule.amount} to ${schedule.recipient_phone} was successful.`,
      type: 'success',
    });
  }
}

async function handleInsufficientBalance(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  schedule: Record<string, unknown>
) {
  const retryCount = (schedule.retry_count as number) + 1;
  const maxRetries = schedule.max_retries as number;

  if (retryCount >= maxRetries) {
    await supabase
      .from('scheduled_purchases')
      .update({
        is_active: false,
        paused_at: new Date().toISOString(),
        pause_reason: 'Insufficient balance after max retries',
        last_status: 'insufficient_balance',
        failure_count: (schedule.failure_count as number) + 1,
      })
      .eq('id', schedule.id);

    await supabase.from('notifications').insert({
      user_id: schedule.user_id,
      title: '⚠️ Schedule Paused',
      message: `Your scheduled ${schedule.service_type} has been paused due to insufficient balance. Please fund your wallet and resume.`,
      type: 'warning',
    });
  } else {
    const retryTime = calculateRetryTime(retryCount, schedule.retry_delay_minutes as number);
    await supabase
      .from('scheduled_purchases')
      .update({
        retry_count: retryCount,
        next_run_at: retryTime.toISOString(),
        last_status: 'insufficient_balance',
      })
      .eq('id', schedule.id);
  }

  await logScheduleExecution(supabase, schedule, 'insufficient_balance', 'Insufficient wallet balance');
}

async function handleFailedPurchase(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  schedule: Record<string, unknown>,
  errorMessage: string
) {
  const retryCount = (schedule.retry_count as number) + 1;
  const maxRetries = schedule.max_retries as number;

  if (retryCount >= maxRetries) {
    const nextRun = calculateNextRun(
      schedule.frequency as ScheduleFrequency,
      schedule.custom_days as number[] | null,
      schedule.preferred_time as string
    );
    await supabase
      .from('scheduled_purchases')
      .update({
        last_run_at: new Date().toISOString(),
        last_status: 'failed',
        last_error: errorMessage,
        next_run_at: nextRun.toISOString(),
        retry_count: 0,
        failure_count: (schedule.failure_count as number) + 1,
      })
      .eq('id', schedule.id);

    if (schedule.notify_on_failure) {
      await supabase.from('notifications').insert({
        user_id: schedule.user_id,
        title: '❌ Scheduled Purchase Failed',
        message: `Your scheduled ${schedule.service_type} of ₦${schedule.amount} failed: ${errorMessage}. Will retry next scheduled time.`,
        type: 'error',
      });
    }
  } else {
    const retryTime = calculateRetryTime(retryCount, schedule.retry_delay_minutes as number);
    await supabase
      .from('scheduled_purchases')
      .update({
        retry_count: retryCount,
        next_run_at: retryTime.toISOString(),
        last_status: 'failed',
        last_error: errorMessage,
      })
      .eq('id', schedule.id);
  }

  await logScheduleExecution(supabase, schedule, 'failed', errorMessage);
}

async function handleServiceUnavailable(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  schedule: Record<string, unknown>
) {
  const retryTime = calculateRetryTime(0, 15); // Retry in 15 min
  await supabase
    .from('scheduled_purchases')
    .update({
      next_run_at: retryTime.toISOString(),
      last_status: 'service_unavailable',
      last_error: 'VTU service temporarily unavailable',
    })
    .eq('id', schedule.id);

  await logScheduleExecution(supabase, schedule, 'service_unavailable', 'Service temporarily unavailable');
}

async function logScheduleExecution(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  schedule: Record<string, unknown>,
  status: string,
  message: string,
  externalRef?: string
) {
  await supabase.from('scheduled_purchase_logs').insert({
    scheduled_purchase_id: schedule.id,
    status,
    amount: schedule.amount,
    error_message: status !== 'success' ? message : null,
    external_reference: externalRef,
    retry_attempt: schedule.retry_count,
    scheduled_for: schedule.next_run_at,
  });
}
