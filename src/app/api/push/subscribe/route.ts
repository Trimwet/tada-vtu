import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription } = body;

    if (!userId || !subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json(
        { status: false, message: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Upsert subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: request.headers.get('user-agent') || null,
        last_used_at: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'user_id,endpoint',
      });

    if (error) {
      console.error('Subscription error:', error);
      return NextResponse.json(
        { status: false, message: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    // Ensure notification preferences exist
    await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId }, { onConflict: 'user_id' });

    return NextResponse.json({
      status: true,
      message: 'Subscribed to push notifications',
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json(
      { status: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, endpoint } = body;

    if (!userId || !endpoint) {
      return NextResponse.json(
        { status: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Unsubscribe error:', error);
      return NextResponse.json(
        { status: false, message: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: true,
      message: 'Unsubscribed from push notifications',
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { status: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
