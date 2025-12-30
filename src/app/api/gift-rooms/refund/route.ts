import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * SECURE Gift Room Refund API
 * Only allows original creators to request refunds for their own gift rooms
 */
export async function POST(request: NextRequest) {
  try {
    const { room_id } = await request.json();

    if (!room_id) {
      return NextResponse.json({
        success: false,
        error: 'Room ID is required'
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Use the secure database function that validates ownership
    const { data: result, error: refundError } = await (supabase as any)
      .rpc('refund_gift_room', {
        room_id: room_id,
        requesting_user_id: user.id
      });

    if (refundError) {
      console.error('Refund function error:', refundError);
      return NextResponse.json({
        success: false,
        error: 'Failed to process refund'
      }, { status: 500 });
    }

    // The function returns a JSONB object with success/error info
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        refund_amount: result.refund_amount,
        unclaimed_count: result.unclaimed_count,
        message: `Successfully refunded ₦${result.refund_amount} for ${result.unclaimed_count} unclaimed gifts`
      }
    });

  } catch (error) {
    console.error('Gift room refund error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Get refund information for a gift room (without processing)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const room_id = searchParams.get('room_id');

    if (!room_id) {
      return NextResponse.json({
        success: false,
        error: 'Room ID is required'
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get room details and validate ownership
    const { data: room, error: roomError } = await (supabase as any)
      .from('gift_rooms')
      .select('sender_id, amount, capacity, claimed_count, status, created_at, expires_at')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({
        success: false,
        error: 'Gift room not found'
      }, { status: 404 });
    }

    // SECURITY: Only allow original creator to view refund info
    if (room.sender_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Only the original creator can view refund information'
      }, { status: 403 });
    }

    const unclaimed_count = room.capacity - room.claimed_count;
    const refund_amount = unclaimed_count * room.amount;
    const can_refund = room.status === 'active' && refund_amount > 0;

    return NextResponse.json({
      success: true,
      data: {
        room_id,
        status: room.status,
        total_capacity: room.capacity,
        claimed_count: room.claimed_count,
        unclaimed_count,
        amount_per_gift: room.amount,
        potential_refund_amount: refund_amount,
        can_refund,
        created_at: room.created_at,
        expires_at: room.expires_at,
        is_expired: new Date(room.expires_at) < new Date()
      }
    });

  } catch (error) {
    console.error('Get refund info error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}