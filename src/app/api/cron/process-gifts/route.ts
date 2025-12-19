import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendGiftNotificationEmail } from '@/lib/email';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// Cron job to process scheduled gifts and handle expired gifts
// Add to vercel.json: { "path": "/api/cron/process-gifts", "schedule": "0 * * * *" }
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel adds this header for cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const results = { scheduled: 0, expired: 0, refunded: 0, errors: [] as string[] };

    // 1. Process scheduled gifts that are due for delivery
    const { data: scheduledGifts, error: scheduledError } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_delivery', now);

    if (scheduledError) {
      results.errors.push(`Scheduled query error: ${scheduledError.message}`);
    } else if (scheduledGifts && scheduledGifts.length > 0) {
      for (const gift of scheduledGifts) {
        try {
          // Update to delivered status
          await supabase
            .from('gift_cards')
            .update({
              status: 'delivered',
              delivered_at: now,
            })
            .eq('id', gift.id);

          // Send email notification to recipient
          try {
            await sendGiftNotificationEmail({
              recipientEmail: gift.recipient_email,
              senderName: gift.sender_name,
              amount: gift.amount,
              occasion: gift.occasion,
              personalMessage: gift.personal_message,
              giftId: gift.id,
              accessToken: gift.access_token,
              expiresAt: gift.expires_at,
            });
          } catch (emailErr) {
            console.error(`Failed to send email for gift ${gift.id}:`, emailErr);
          }

          // Notify recipient if they're a TADA user
          if (gift.recipient_user_id) {
            await supabase.from('notifications').insert({
              user_id: gift.recipient_user_id,
              title: '🎁 You received a gift!',
              message: `${gift.sender_name} sent you a gift! Open it now.`,
              type: 'success',
            });
          }

          // Notify sender
          if (gift.sender_id) {
            await supabase.from('notifications').insert({
              user_id: gift.sender_id,
              title: 'Gift Delivered!',
              message: `Your scheduled gift to ${gift.recipient_email} has been delivered.`,
              type: 'success',
            });
          }

          results.scheduled++;
        } catch (err) {
          results.errors.push(`Failed to deliver gift ${gift.id}: ${err}`);
        }
      }
    }

    // 2. Mark expired gifts and process refunds
    const { data: expiredGifts, error: expiredError } = await supabase
      .from('gift_cards')
      .select('*')
      .in('status', ['delivered', 'opened'])
      .lt('expires_at', now);

    if (expiredError) {
      results.errors.push(`Expired query error: ${expiredError.message}`);
    } else if (expiredGifts && expiredGifts.length > 0) {
      for (const gift of expiredGifts) {
        try {
          // Mark as expired
          await supabase
            .from('gift_cards')
            .update({ status: 'expired' })
            .eq('id', gift.id);

          results.expired++;

          // Process refund to sender
          if (gift.sender_id) {
            // Get sender's current balance
            const { data: sender } = await supabase
              .from('profiles')
              .select('balance')
              .eq('id', gift.sender_id)
              .single();

            if (sender) {
              const refundReference = `REFUND_GIFT_${gift.id}`;
              
              // Credit refund to sender
              await supabase
                .from('profiles')
                .update({ balance: sender.balance + gift.amount })
                .eq('id', gift.sender_id);

              // Record refund transaction
              await supabase.from('transactions').insert({
                user_id: gift.sender_id,
                type: 'deposit',
                amount: gift.amount,
                status: 'success',
                description: `Refund for expired gift to ${gift.recipient_email}`,
                reference: refundReference,
              });

              // Update gift with refund info
              await supabase
                .from('gift_cards')
                .update({
                  refunded_at: now,
                  refund_transaction_id: refundReference,
                })
                .eq('id', gift.id);

              // Notify sender
              await supabase.from('notifications').insert({
                user_id: gift.sender_id,
                title: 'Gift Expired - Refunded',
                message: `Your gift to ${gift.recipient_email} expired and ₦${gift.amount.toLocaleString()} has been refunded.`,
                type: 'info',
              });

              results.refunded++;
            }
          }
        } catch (err) {
          results.errors.push(`Failed to process expired gift ${gift.id}: ${err}`);
        }
      }
    }

    // 3. Reset stuck crediting gifts (timeout after 5 minutes)
    try {
      const { data: stuckCount } = await supabase.rpc('reset_stuck_crediting_gifts');
      if (stuckCount && stuckCount > 0) {
        results.errors.push(`Reset ${stuckCount} stuck crediting gift(s)`);
      }
    } catch {
      // Fallback if RPC not available
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: stuckGifts } = await supabase
        .from('gift_cards')
        .update({
          status: 'opened',
          last_error: 'Crediting timeout - please retry',
        })
        .eq('status', 'crediting')
        .lt('crediting_started_at', fiveMinutesAgo)
        .select('id');
      
      if (stuckGifts && stuckGifts.length > 0) {
        results.errors.push(`Reset ${stuckGifts.length} stuck crediting gift(s)`);
      }
    }

    console.log('Gift cron job completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Gift processing completed',
      results,
      timestamp: now,
    });

  } catch (error) {
    console.error('Gift cron error:', error);
    return NextResponse.json(
      { success: false, error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
