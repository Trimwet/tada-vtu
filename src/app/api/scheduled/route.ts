import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateScheduledPurchase, calculateNextRun, type ScheduledPurchaseInput } from '@/lib/scheduled-purchases';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// GET - Fetch user's scheduled purchases
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: schedules, error } = await supabase
      .from('scheduled_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schedules:', error);
      return NextResponse.json({ status: false, message: 'Failed to fetch schedules' }, { status: 500 });
    }

    return NextResponse.json({
      status: true,
      data: schedules || [],
    });
  } catch (error) {
    console.error('Scheduled GET error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}

// POST - Create new scheduled purchase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...input } = body as { userId: string } & ScheduledPurchaseInput;

    if (!userId) {
      return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    }

    // Validate input
    const validation = validateScheduledPurchase(input);
    if (!validation.valid) {
      return NextResponse.json({ status: false, message: validation.errors.join(', ') }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check user exists and has sufficient balance for at least one run
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });
    }

    if (profile.balance < input.amount) {
      return NextResponse.json({
        status: false,
        message: `Insufficient balance. You need at least ₦${input.amount} to create this schedule.`,
      }, { status: 400 });
    }

    // Calculate first run time
    const nextRunAt = calculateNextRun(
      input.frequency,
      input.custom_days || null,
      input.preferred_time || '09:00:00'
    );

    // Create scheduled purchase
    const { data: schedule, error: createError } = await supabase
      .from('scheduled_purchases')
      .insert({
        user_id: userId,
        service_type: input.service_type,
        amount: input.amount,
        recipient_phone: input.recipient_phone || null,
        network: input.network || null,
        data_plan_id: input.data_plan_id || null,
        meter_number: input.meter_number || null,
        smartcard_number: input.smartcard_number || null,
        frequency: input.frequency,
        custom_days: input.custom_days || null,
        preferred_time: input.preferred_time || '09:00:00',
        smart_timing_enabled: input.smart_timing_enabled || false,
        next_run_at: nextRunAt.toISOString(),
        notify_on_success: input.notify_on_success ?? true,
        notify_on_failure: input.notify_on_failure ?? true,
        notify_before_run: input.notify_before_run ?? false,
        expires_at: input.expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating schedule:', createError);
      return NextResponse.json({ status: false, message: 'Failed to create schedule' }, { status: 500 });
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      title: '⏰ Schedule Created',
      message: `Your ${input.service_type} schedule for ₦${input.amount} has been created. First run: ${nextRunAt.toLocaleDateString()}`,
      type: 'success',
    });

    return NextResponse.json({
      status: true,
      message: 'Schedule created successfully!',
      data: schedule,
    });
  } catch (error) {
    console.error('Scheduled POST error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}

// PATCH - Update scheduled purchase (pause/resume/modify)
export async function PATCH(request: NextRequest) {
  try {
    const { scheduleId, userId, action, updates } = await request.json();

    if (!scheduleId || !userId) {
      return NextResponse.json({ status: false, message: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_purchases')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ status: false, message: 'Schedule not found' }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'pause':
        updateData = {
          is_active: false,
          paused_at: new Date().toISOString(),
          pause_reason: updates?.reason || 'User paused',
        };
        break;

      case 'resume':
        // Recalculate next run time
        const nextRun = calculateNextRun(
          existing.frequency,
          existing.custom_days,
          existing.preferred_time
        );
        updateData = {
          is_active: true,
          paused_at: null,
          pause_reason: null,
          next_run_at: nextRun.toISOString(),
          retry_count: 0,
        };
        break;

      case 'update':
        if (updates) {
          // Validate if changing critical fields
          if (updates.amount || updates.frequency || updates.recipient_phone) {
            const validation = validateScheduledPurchase({
              ...existing,
              ...updates,
            });
            if (!validation.valid) {
              return NextResponse.json({ status: false, message: validation.errors.join(', ') }, { status: 400 });
            }
          }

          updateData = {
            ...updates,
            updated_at: new Date().toISOString(),
          };

          // Recalculate next run if frequency changed
          if (updates.frequency || updates.custom_days || updates.preferred_time) {
            const nextRun = calculateNextRun(
              updates.frequency || existing.frequency,
              updates.custom_days || existing.custom_days,
              updates.preferred_time || existing.preferred_time
            );
            updateData.next_run_at = nextRun.toISOString();
          }
        }
        break;

      default:
        return NextResponse.json({ status: false, message: 'Invalid action' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('scheduled_purchases')
      .update(updateData)
      .eq('id', scheduleId);

    if (updateError) {
      console.error('Error updating schedule:', updateError);
      return NextResponse.json({ status: false, message: 'Failed to update schedule' }, { status: 500 });
    }

    return NextResponse.json({
      status: true,
      message: `Schedule ${action}d successfully!`,
    });
  } catch (error) {
    console.error('Scheduled PATCH error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}

// DELETE - Remove scheduled purchase
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');
    const userId = request.headers.get('x-user-id');

    if (!scheduleId || !userId) {
      return NextResponse.json({ status: false, message: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('scheduled_purchases')
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting schedule:', error);
      return NextResponse.json({ status: false, message: 'Failed to delete schedule' }, { status: 500 });
    }

    return NextResponse.json({
      status: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    console.error('Scheduled DELETE error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}
