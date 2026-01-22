import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { JoinGiftRoomResponse } from '@/types/gift-room';

export async function POST(request: NextRequest): Promise<NextResponse<JoinGiftRoomResponse>> {
  try {
    const supabase = await createClient();

    // SIMPLIFIED: Require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Please login to join this gift room'
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { room_token } = body;

    if (!room_token) {
      return NextResponse.json({
        success: false,
        error: 'Room token is required'
      }, { status: 400 });
    }

    // Get gift room details (using admin client to bypass RLS)
    const adminClient = createAdminClient();
    const { data: room, error: roomError } = await adminClient
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
    if (user.id === (room as any).sender_id) {
      return NextResponse.json({
        success: false,
        error: 'You cannot join your own gift room'
      }, { status: 400 });
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

    // Extract additional info from body
    const { device_fingerprint, contact_info } = body;

    // USE ROBUST: Create reservation using idempotent database function
    const { data: reservationId, error: createError } = await (supabase.rpc as any)('create_reservation', {
      p_room_id: (room as any).id,
      p_device_fingerprint: device_fingerprint?.hash || null,
      p_contact_info: contact_info || null,
      p_user_id: user.id
    });

    if (createError) {
      console.error('Error creating reservation:', createError);

      if (createError.message.includes('Gift room is full')) {
        return NextResponse.json({
          success: false,
          error: 'All spots have been taken. Try joining another gift room.'
        }, { status: 400 });
      }

      if (createError.message.includes('already has a reservation') || createError.message.includes('duplicate key')) {
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
        error: `Failed to join gift room: ${createError.message}`
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
    const { data: updatedRoom } = await supabase
      .from('gift_rooms')
      .select('*')
      .eq('id', (room as any).id)
      .single();

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
