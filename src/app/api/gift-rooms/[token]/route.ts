import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GiftRoomDetailsResponse } from '@/types/gift-room';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<GiftRoomDetailsResponse>> {
  try {
    const supabase = await createClient();
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const deviceHash = searchParams.get('device_hash');

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Gift room token is required'
      }, { status: 400 });
    }

    // Get gift room details with sender info
    const { data: roomData, error: roomError } = await supabase
      .from('gift_rooms')
      .select(`
        *,
        sender:profiles!sender_id (
          full_name,
          referral_code
        )
      `)
      .eq('token', token)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({
        success: false,
        error: 'Gift room not found'
      }, { status: 404 });
    }

    // Check if room is expired
    const now = new Date();
    const expiresAt = new Date((roomData as any).expires_at);
    const isExpired = expiresAt < now;

    // Update status if expired
    if (isExpired && (roomData as any).status !== 'expired') {
      // Note: Status update would happen here in production
      (roomData as any).status = 'expired';
    }

    // Check for existing reservation if device hash provided
    let userReservation = null;
    if (deviceHash) {
      const { data: reservation } = await supabase
        .from('reservations')
        .select('*')
        .eq('room_id', (roomData as any).id)
        .eq('device_fingerprint', deviceHash)
        .single();

      userReservation = reservation;
    }

    // Determine if user can join
    const canJoin = !isExpired && 
                   (roomData as any).status === 'active' && 
                   (roomData as any).joined_count < (roomData as any).capacity &&
                   !userReservation;

    // Calculate spots remaining
    const spotsRemaining = Math.max(0, (roomData as any).capacity - (roomData as any).joined_count);

    return NextResponse.json({
      success: true,
      data: {
        room: roomData,
        sender: (roomData as any).sender,
        user_reservation: userReservation || undefined,
        can_join: canJoin,
        spots_remaining: spotsRemaining
      }
    } as GiftRoomDetailsResponse);

  } catch (error) {
    console.error('Error getting gift room details:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}