import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateNotificationMessage,
  sendPushNotification,
  type NotificationType,
} from '@/lib/push-notifications';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// POST - Send push notification to user(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      userIds, 
      type, 
      context,
      // Optional: override AI-generated message
      customTitle,
      customBody,
    } = body;

    // Validate type
    const validTypes: NotificationType[] = [
      'gift_received', 
      'transaction_success', 
      'transaction_failed',
      'low_balance', 
      'promotional',
      'daily_tip'
    ];
    
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { status: false, message: 'Invalid notification type' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const targetUserIds = userIds || (userId ? [userId] : []);

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { status: false, message: 'No target users specified' },
        { status: 400 }
      );
    }

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const targetUserId of targetUserIds) {
      try {
        // Check user preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        // Check if this notification type is enabled
        if (prefs) {
          if (!prefs.push_enabled) {
            results.skipped++;
            continue;
          }
          
          const prefMap: Record<NotificationType, boolean> = {
            gift_received: prefs.gift_received,
            transaction_success: prefs.transaction_success,
            transaction_failed: prefs.transaction_failed,
            low_balance: prefs.low_balance_warning,
            promotional: prefs.promotional,
            daily_tip: prefs.daily_tip,
          };

          if (!prefMap[type as NotificationType]) {
            results.skipped++;
            continue;
          }
        }

        // Get user's active subscriptions
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('is_active', true);

        if (!subscriptions || subscriptions.length === 0) {
          results.skipped++;
          continue;
        }

        // Get user info for personalization
        const { data: user } = await supabase
          .from('profiles')
          .select('full_name, balance')
          .eq('id', targetUserId)
          .single();

        // Generate AI notification message
        const notification = customTitle && customBody 
          ? { title: customTitle, body: customBody, icon: '/logo-icon.svg', badge: '/logo-icon.svg' }
          : await generateNotificationMessage({
              type,
              userName: user?.full_name || undefined,
              balance: user?.balance,
              ...context,
            });

        // Send to all user's devices
        for (const sub of subscriptions) {
          const result = await sendPushNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notification
          );

          if (result.success) {
            results.sent++;
            
            // Update last_used_at
            await supabase
              .from('push_subscriptions')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', sub.id);
          } else {
            results.failed++;
            
            // If subscription is invalid, mark as inactive
            if (result.error?.includes('410') || result.error?.includes('expired')) {
              await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('id', sub.id);
            }
            
            results.errors.push(`User ${targetUserId}: ${result.error}`);
          }
        }

        // Log notification
        await supabase.from('notification_log').insert({
          user_id: targetUserId,
          type,
          title: notification.title,
          body: notification.body,
          data: context,
          delivered: results.sent > 0,
        });

      } catch (userError) {
        results.failed++;
        results.errors.push(`User ${targetUserId}: ${userError}`);
      }
    }

    return NextResponse.json({
      status: true,
      message: 'Notifications processed',
      results,
    });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json(
      { status: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
