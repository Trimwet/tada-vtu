import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseAirtime, purchaseData, ServiceUnavailableError } from '@/lib/api/inlomax';
import { calculateNextRun, calculateRetryTime } from '@/lib/scheduled-purchases';
import type { ScheduleFrequency } from '@/types/database';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// POST - Process due scheduled purchases (called by cron job)
// Vercel Cron: Add to vercel.json: { "crons": [{ "path": "/api/scheduled/process", "schedule": "*/15 * * * *" }] }
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional security)
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const results: Array<{ id: string; status: string; message: string }> = [];

    // Fetch due schedules (with 5 minute tolerance)
    const toleranceTime = new Date(now.getTime() + 5 * 60 * 1000);
    
    const { data: dueSchedules, error: fetchError } = await supabase
      .from('scheduled_purchases')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', toleranceTime.toISOString())
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
      .limit(50); // Process max 50 per run

    if (fetchError) {
      console.error('Error fetching due schedules:', fetchError);
      return NextResponse.json({ status: false, message: 'Failed to fetch schedules' }, { status: 500 });
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return NextResponse.json({
        status: true,
        message: 'No schedules due',
        processed: 0,
      });
    }

    console.log(`[CRON] Processing ${dueSchedules.length} scheduled purchases`);

    for (const schedule of dueSchedules) {
      try {
        // Get user balance
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', schedule.user_id)
          .single();

        if (profileError || !profile) {
          await logScheduleExecution(supabase, schedule, 'failed', 'User not found');
          results.push({ id: schedule.id, status: 'failed', message: 'User not found' });
          continue;
        }

        // Check balance
        if (profile.balance < schedule.amount) {
          await handleInsufficientBalance(supabase, schedule);
          results.push({ id: schedule.id, status: 'insufficient_balance', message: 'Insufficient balance' });
          continue;
        }

        // Execute purchase based on service type
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

          // TODO: Add cable and electricity handlers
          default:
            purchaseResult = { status: 'failed', message: 'Unsupported service type' };
        }

        if (purchaseResult.status === 'success') {
          await handleSuccessfulPurchase(supabase, schedule, purchaseResult, profile.balance);
          results.push({ id: schedule.id, status: 'success', message: 'Purchase completed' });
        } else if (purchaseResult.status === 'processing') {
          // Mark as pending, will be verified later
          await logScheduleExecution(supabase, schedule, 'success', 'Processing', purchaseResult.data?.reference);
          results.push({ id: schedule.id, status: 'processing', message: 'Purchase processing' });
        } else {
          await handleFailedPurchase(supabase, schedule, purchaseResult.message);
          results.push({ id: schedule.id, status: 'failed', message: purchaseResult.message });
        }

      } catch (error) {
        console.error(`[CRON] Error processing schedule ${schedule.id}:`, error);
        
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

// Helper functions
async function handleSuccessfulPurchase(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  schedule: Record<string, unknown>,
  result: { data?: { reference?: string } },
  currentBalance: number
) {
  const amount = schedule.amount as number;
  const newBalance = currentBalance - amount;

  // Deduct balance
  await supabase
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', schedule.user_id);

  // Create transaction record
  const reference = `SCHED_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  await supabase.from('transactions').insert({
    user_id: schedule.user_id,
    type: schedule.service_type,
    amount: -amount,
    status: 'success',
    reference,
    external_reference: result.data?.reference,
    phone_number: schedule.recipient_phone,
    network: schedule.network,
    description: `Scheduled ${schedule.service_type} - ₦${amount}`,
  });

  // Calculate next run
  const nextRun = calculateNextRun(
    schedule.frequency as ScheduleFrequency,
    schedule.custom_days as number[] | null,
    schedule.preferred_time as string
  );

  // Update schedule
  await supabase
    .from('scheduled_purchases')
    .update({
      last_run_at: new Date().toISOString(),
      last_status: 'success',
      last_error: null,
      next_run_at: nextRun.toISOString(),
      retry_count: 0,
      success_count: (schedule.success_count as number) + 1,
      total_spent: (schedule.total_spent as number) + amount,
    })
    .eq('id', schedule.id);

  // Log execution
  await logScheduleExecution(supabase, schedule, 'success', 'Purchase completed', result.data?.reference);

  // Send notification if enabled
  if (schedule.notify_on_success) {
    await supabase.from('notifications').insert({
      user_id: schedule.user_id,
      title: '✅ Scheduled Purchase Complete',
      message: `Your scheduled ${schedule.service_type} of ₦${amount} to ${schedule.recipient_phone} was successful.`,
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
    // Max retries reached, pause schedule
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
    // Schedule retry
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
    // Calculate next regular run instead of pausing
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
    // Schedule retry with exponential backoff
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
  // Always retry for service unavailable (not user's fault)
  const retryTime = calculateRetryTime(0, 15); // Retry in 15 minutes
  
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
