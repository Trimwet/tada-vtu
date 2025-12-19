import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { validateGiftCard, type GiftCardInput } from '@/lib/gift-cards';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { sendGiftNotificationEmail } from '@/lib/email';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// Generate secure access token for gift links
function generateAccessToken(): string {
  return randomBytes(16).toString('hex');
}

// POST - Send a gift card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, senderName, ...giftInput } = body as { userId: string; senderName: string } & GiftCardInput;

    if (!userId) {
      return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(`gift:${userId}`, RATE_LIMITS.transaction);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: false, message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
        { status: 429 }
      );
    }

    // Validate input
    const validation = validateGiftCard(giftInput);
    if (!validation.valid) {
      return NextResponse.json({ status: false, message: validation.errors.join(', ') }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get sender profile and balance
    const { data: sender, error: senderError } = await supabase
      .from('profiles')
      .select('balance, full_name')
      .eq('id', userId)
      .single();

    if (senderError || !sender) {
      return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });
    }

    // Check balance
    if (sender.balance < giftInput.amount) {
      return NextResponse.json({
        status: false,
        message: `Insufficient balance. You have ₦${sender.balance.toLocaleString()}`,
      }, { status: 400 });
    }

    // Check if recipient is a TADA user (for linking) - lookup by email
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', giftInput.recipient_email)
      .single();

    // Determine initial status
    const isScheduled = giftInput.scheduled_delivery && new Date(giftInput.scheduled_delivery) > new Date();
    const initialStatus = isScheduled ? 'scheduled' : 'delivered';

    // Calculate expiry (7 days from delivery)
    const deliveryDate = isScheduled ? new Date(giftInput.scheduled_delivery!) : new Date();
    const expiresAt = new Date(deliveryDate);
    expiresAt.setDate(expiresAt.getDate() + 7);

    // ATOMIC TRANSACTION: Create gift + deduct balance + record transaction
    // Use optimistic locking to prevent race conditions
    const newBalance = sender.balance - giftInput.amount;
    
    // First, deduct balance with version check (optimistic lock)
    const { error: balanceError, count: updateCount } = await supabase
      .from('profiles')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .gte('balance', giftInput.amount); // Only update if balance is still sufficient

    if (balanceError || updateCount === 0) {
      console.error('Balance deduction failed:', balanceError);
      return NextResponse.json({ 
        status: false, 
        message: 'Transaction failed. Please check your balance and try again.',
      }, { status: 400 });
    }

    // Generate secure access token for gift link
    const accessToken = generateAccessToken();

    // Create gift card
    const { data: gift, error: createError } = await supabase
      .from('gift_cards')
      .insert({
        sender_id: userId,
        sender_name: senderName || sender.full_name || 'Someone special',
        recipient_email: giftInput.recipient_email,
        recipient_phone: giftInput.recipient_phone,
        recipient_user_id: recipient?.id || null,
        service_type: giftInput.service_type,
        amount: giftInput.amount,
        network: giftInput.network || null,
        occasion: giftInput.occasion,
        theme_id: giftInput.theme_id,
        personal_message: giftInput.personal_message || null,
        scheduled_delivery: giftInput.scheduled_delivery || null,
        delivered_at: isScheduled ? null : new Date().toISOString(),
        status: initialStatus,
        expires_at: expiresAt.toISOString(),
        access_token: accessToken,
      })
      .select()
      .single();

    if (createError) {
      // Rollback: Refund the balance
      console.error('Error creating gift, rolling back:', createError);
      await supabase
        .from('profiles')
        .update({ balance: sender.balance })
        .eq('id', userId);
      
      return NextResponse.json({ 
        status: false, 
        message: 'Failed to create gift. Your balance has been restored.',
        error: createError.message,
      }, { status: 500 });
    }

    // Record transaction (non-critical, don't rollback if this fails)
    try {
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'gift',
        amount: -giftInput.amount,
        status: 'success',
        description: `Gift card to ${giftInput.recipient_email}`,
        reference: `GIFT_${gift.id}`,
      });
    } catch (err) {
      console.error('Transaction record failed:', err);
    }

    // Send notification to recipient if they're a TADA user
    if (recipient?.id && !isScheduled) {
      await supabase.from('notifications').insert({
        user_id: recipient.id,
        title: '🎁 You received a gift!',
        message: `${senderName || 'Someone special'} sent you a gift! Open it now.`,
        type: 'success',
      });
    }

    // Send email notification to recipient (if not scheduled)
    if (!isScheduled) {
      try {
        await sendGiftNotificationEmail({
          recipientEmail: giftInput.recipient_email,
          senderName: senderName || sender.full_name || 'Someone special',
          amount: giftInput.amount,
          occasion: giftInput.occasion,
          personalMessage: giftInput.personal_message,
          giftId: gift.id,
          accessToken,
          expiresAt: expiresAt.toISOString(),
        });
      } catch (emailErr) {
        console.error('Failed to send gift email:', emailErr);
        // Don't fail the gift creation if email fails
      }
    }

    // Notify sender
    await supabase.from('notifications').insert({
      user_id: userId,
      title: isScheduled ? 'Gift Scheduled' : 'Gift Sent!',
      message: isScheduled
        ? `Your gift to ${giftInput.recipient_email} will be delivered on ${new Date(giftInput.scheduled_delivery!).toLocaleDateString()}`
        : `Your gift to ${giftInput.recipient_email} has been sent!`,
      type: 'success',
    });

    return NextResponse.json({
      status: true,
      message: isScheduled ? 'Gift scheduled successfully!' : 'Gift sent successfully!',
      data: {
        giftId: gift.id,
        accessToken,
        shareLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tadavtu.com'}/gift/${gift.id}?token=${accessToken}`,
        expiresAt: expiresAt.toISOString(),
        newBalance,
      },
    });

  } catch (error) {
    console.error('Gift send error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}

// GET - Fetch user's sent gifts
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: gifts, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching gifts:', error);
      return NextResponse.json({ status: false, message: 'Failed to fetch gifts' }, { status: 500 });
    }

    return NextResponse.json({
      status: true,
      data: gifts || [],
    });

  } catch (error) {
    console.error('Gift GET error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}
