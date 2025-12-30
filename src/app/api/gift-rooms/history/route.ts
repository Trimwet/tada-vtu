import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GiftRoomListResponse } from '@/types/gift-room';

export async function GET(request: NextRequest): Promise<NextResponse<GiftRoomListResponse>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get gift rooms sent by user
    const { data: sentRooms, error: sentError } = await supabase
      .from('gift_rooms')
      .select('id, type, capacity, amount, total_amount, message, token, status, joined_count, claimed_count, created_at, expires_at')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sentError) {
      console.error('Error fetching sent gift rooms:', sentError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch sent gift rooms'
      }, { status: 500 });
    }

    const { data: receivedClaims, error: receivedError } = await supabase
      .from('gift_claims')
      .select(`
        id, reservation_id, user_id, amount, referral_bonus_awarded, claimed_at,
        reservation:reservations (
          room_id,
          room:gift_rooms (
            id,
            sender_id,
            type,
            amount,
            message,
            token,
            created_at,
            sender:profiles!sender_id (
              full_name,
              referral_code
            )
          )
        )
      `)
      .eq('user_id', user.id)
      .order('claimed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (receivedError) {
      console.error('Error fetching received gift claims:', receivedError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch received gifts'
      }, { status: 500 });
    }

    // Calculate totals
    const { data: sentTotal } = await supabase
      .from('gift_rooms')
      .select('total_amount')
      .eq('sender_id', user.id);

    const { data: receivedTotal } = await supabase
      .from('gift_claims')
      .select('amount')
      .eq('user_id', user.id);

    const totalSent = sentTotal?.reduce((sum, room) => sum + parseFloat((room as any).total_amount), 0) || 0;
    const totalReceived = receivedTotal?.reduce((sum, claim) => sum + parseFloat((claim as any).amount), 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        sent: sentRooms || [],
        received: receivedClaims || [],
        total_sent: totalSent,
        total_received: totalReceived
      }
    });

  } catch (error) {
    console.error('Error getting gift room history:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}