import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// POST - Cancel a gift and refund sender
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

    const supabase = getSupabaseAdmin();

    // Get gift details
    const { data: gift, error: giftError } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', giftId)
      .single();

    if (giftError || !gift) {
      return NextResponse.json(
        { status: false, message: 'Gift not found' },
        { status: 404 }
      );
    }

    // Verify sender owns this gift
    if (gift.sender_id !== userId) {
      return NextResponse.json(
        { status: false, message: 'You can only cancel your own gifts' },
        { status: 403 }
      );
    }

    // Check if gift can be cancelled
    const cancellableStatuses = ['scheduled', 'delivered'];
    if (!cancellableStatuses.includes(gift.status)) {
      return NextResponse.json(
        { status: false, message: `Cannot cancel a gift that is ${gift.status}` },
        { status: 400 }
      );
    }

    // Check 24-hour cancellation window for delivered gifts
    if (gift.status === 'delivered' && gift.delivered_at) {
      const deliveredAt = new Date(gift.delivered_at);
      const hoursSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceDelivery > 24) {
        return NextResponse.json(
          { status: false, message: 'Gifts can only be cancelled within 24 hours of delivery' },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const refundReference = `CANCEL_GIFT_${giftId}`;

    // Get sender's current balance
    const { data: sender, error: senderError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (senderError || !sender) {
      return NextResponse.json(
        { status: false, message: 'Sender profile not found' },
        { status: 404 }
      );
    }

    // Update gift status to cancelled
    const { error: updateError } = await supabase
      .from('gift_cards')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        cancelled_by: userId,
        refunded_at: now,
        refund_transaction_id: refundReference,
      })
      .eq('id', giftId);

    if (updateError) {
      console.error('Failed to cancel gift:', updateError);
      return NextResponse.json(
        { status: false, message: 'Failed to cancel gift' },
        { status: 500 }
      );
    }

    // Refund to sender
    const newBalance = sender.balance + gift.amount;
    await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', userId);

    // Record refund transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'deposit',
      amount: gift.amount,
      status: 'success',
      description: `Cancelled gift refund - ${gift.recipient_email}`,
      reference: refundReference,
    });

    // Notify sender
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Gift Cancelled',
      message: `Your gift to ${gift.recipient_email} has been cancelled. ₦${gift.amount.toLocaleString()} refunded.`,
      type: 'info',
    });

    // Notify recipient if they're a TADA user
    if (gift.recipient_user_id) {
      await supabase.from('notifications').insert({
        user_id: gift.recipient_user_id,
        title: 'Gift Cancelled',
        message: `A gift from ${gift.sender_name} has been cancelled.`,
        type: 'info',
      });
    }

    return NextResponse.json({
      status: true,
      message: 'Gift cancelled and refunded successfully',
      data: {
        refundAmount: gift.amount,
        newBalance,
      },
    });

  } catch (error) {
    console.error('Gift cancel error:', error);
    return NextResponse.json(
      { status: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
