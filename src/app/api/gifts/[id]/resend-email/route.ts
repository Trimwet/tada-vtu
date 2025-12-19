import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendGiftNotificationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// POST - Resend gift notification email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: giftId } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!giftId || !userId) {
      return NextResponse.json(
        { status: false, message: 'Gift ID and user ID required' },
        { status: 400 }
      );
    }

    // Rate limit: max 3 resends per gift per hour
    const rateLimit = checkRateLimit(`resend-email:${giftId}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: false, message: `Too many resend attempts. Try again in ${Math.ceil(rateLimit.resetIn / 60000)} minutes.` },
        { status: 429 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get gift details
    const { data: gift, error: giftError } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', giftId)
      .single();

    if (giftError || !gift) {
      return NextResponse.json({ status: false, message: 'Gift not found' }, { status: 404 });
    }

    // Verify sender owns this gift
    if (gift.sender_id !== userId) {
      return NextResponse.json(
        { status: false, message: 'You can only resend emails for your own gifts' },
        { status: 403 }
      );
    }

    // Only resend for delivered gifts
    if (gift.status !== 'delivered') {
      return NextResponse.json(
        { status: false, message: `Cannot resend email for ${gift.status} gifts` },
        { status: 400 }
      );
    }

    // Send email
    const result = await sendGiftNotificationEmail({
      recipientEmail: gift.recipient_email,
      senderName: gift.sender_name,
      amount: gift.amount,
      occasion: gift.occasion,
      personalMessage: gift.personal_message,
      giftId: gift.id,
      accessToken: gift.access_token,
      expiresAt: gift.expires_at,
    });

    if (result.success) {
      return NextResponse.json({
        status: true,
        message: 'Email sent successfully',
      });
    } else {
      return NextResponse.json(
        { status: false, message: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Resend email error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}
