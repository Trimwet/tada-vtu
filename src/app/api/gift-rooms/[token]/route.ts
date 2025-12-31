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
        id, sender_id, type, capacity, amount, total_amount, message, token, status, joined_count, claimed_count, created_at, expires_at,
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (deviceHash) {
      const { data: reservation } = await supabase
        .from('reservations')
        .select('id, room_id, device_fingerprint, status, created_at, expires_at, claimed_at')
        .eq('room_id', (roomData as any).id)
        .eq('device_fingerprint', deviceHash)
        .eq('status', 'active')
        .single();

      userReservation = reservation;
    }

    // Also check by user_id if authenticated
    if (user && !userReservation) {
      const { data: reservation } = await supabase
        .from('reservations')
        .select('id, room_id, device_fingerprint, status, created_at, expires_at, claimed_at')
        .eq('room_id', (roomData as any).id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      userReservation = reservation;
    }

    // Check if user is the sender
    const isRoomSender = user && user.id === (roomData as any).sender_id;

    // Get actual count of active reservations (more accurate than joined_count)
    const { count: activeReservationsCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', (roomData as any).id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    const actualActiveCount = activeReservationsCount || 0;

    // Determine if user can join
    const canJoin = !isExpired &&
      (roomData as any).status === 'active' &&
      actualActiveCount < (roomData as any).capacity &&
      !userReservation &&
      !isRoomSender; // Prevent sender from joining their own room

    // Calculate spots remaining based on actual active reservations
    const spotsRemaining = Math.max(0, (roomData as any).capacity - actualActiveCount);

    return NextResponse.json({
      success: true,
      data: {
        room: roomData,
        sender: (roomData as any).sender || { full_name: 'Someone', referral_code: '' },
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