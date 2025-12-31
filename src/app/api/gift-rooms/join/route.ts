import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { JoinGiftRoomRequest, JoinGiftRoomResponse } from '@/types/gift-room';

export async function POST(request: NextRequest): Promise<NextResponse<JoinGiftRoomResponse>> {
  try {
    const supabase = await createClient();

    // Parse request body
    const body: JoinGiftRoomRequest = await request.json();
    const { room_token, device_fingerprint, contact_info } = body;

    // Validate input
    if (!room_token || !device_fingerprint) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: room_token, device_fingerprint'
      }, { status: 400 });
    }

    // Check authentication to prevent sender from joining their own room
    const { data: { user } } = await supabase.auth.getUser();

    // Get gift room details
    const { data: room, error: roomError } = await supabase
      .from('gift_rooms')
      .select('*')
      .eq('token', room_token)
      .single();

    if (roomError || !room) {
      return NextResponse.json({
        success: false,
        error: 'Gift room not found'
      }, { status: 404 });
    }

    // Prevent sender from joining their own room
    if (user && user.id === (room as any).sender_id) {
      return NextResponse.json({
        success: false,
        error: 'You cannot join your own gift room'
      }, { status: 400 });
    }

    if (roomError || !room) {
      return NextResponse.json({
        success: false,
        error: 'Gift room not found'
      }, { status: 404 });
    }

    // Check if room is expired
    const now = new Date();
    const expiresAt = new Date((room as any).expires_at);
    if (expiresAt < now) {
      return NextResponse.json({
        success: false,
        error: 'This gift room has expired'
      }, { status: 400 });
    }

    // Check if room is active
    if ((room as any).status !== 'active') {
      if ((room as any).status === 'full') {
        return NextResponse.json({
          success: false,
          error: 'This gift room is full'
        }, { status: 400 });
      }
      return NextResponse.json({
        success: false,
        error: 'This gift room is no longer available'
      }, { status: 400 });
    }

    // Get client IP for logging
    const clientIP = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Create reservation using database function
    // Cast strict arguments
    const { data: reservationId, error: createError } = await (supabase.rpc as any)('create_reservation', {
      p_room_id: (room as any).id,
      p_device_fingerprint: device_fingerprint.hash,
      p_contact_info: contact_info || null
    });

    if (createError) {
      console.error('Error creating reservation:', createError);

      // Handle specific errors
      if (createError.message.includes('Gift room is full')) {
        return NextResponse.json({
          success: false,
          error: 'This gift room is now full. Try joining another gift room.'
        }, { status: 400 });
      }

      if (createError.message.includes('Device already has a reservation')) {
        return NextResponse.json({
          success: false,
          error: 'You already have a reservation in this gift room'
        }, { status: 400 });
      }

      if (createError.message.includes('no longer active')) {
        return NextResponse.json({
          success: false,
          error: 'This gift room is no longer available'
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: `Failed to join: ${createError.message}`
      }, { status: 400 });
    }

    // Get the created reservation details
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) {
      console.error('Error fetching created reservation:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Reservation created but failed to retrieve details'
      }, { status: 500 });
    }

    // Get updated room details
    const { data: updatedRoom, error: roomFetchError } = await supabase
      .from('gift_rooms')
      .select('*')
      .eq('id', (room as any).id)
      .single();

    if (roomFetchError) {
      console.error('Error fetching updated room:', roomFetchError);
    }

    // Link reservation to user if logged in
    if (user) {
      // Use any cast to bypass strict typing on table definition
      const { error: linkError } = await (supabase
        .from('reservations') as any)
        .update({ user_id: user.id })
        .eq('id', reservationId);

      if (linkError) {
        console.error('Error linking reservation to user:', linkError);
      }
    }

    // Log the join activity with IP address
    await supabase
      .from('gift_room_activities')
      .insert({
        room_id: (room as any).id,
        activity_type: 'joined',
        details: {
          reservation_id: reservationId,
          device_fingerprint: device_fingerprint.hash,
          contact_info: contact_info || null
        },
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent') || 'unknown'
      } as any);

    return NextResponse.json({
      success: true,
      data: {
        reservation_id: (reservation as any).id,
        temp_token: (reservation as any).temp_token,
        room: updatedRoom || room,
        reservation: reservation
      }
    });

  } catch (error) {
    console.error('Unexpected error in gift room join:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}