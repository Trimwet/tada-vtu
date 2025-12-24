import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createClient();
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const deviceHash = searchParams.get('device_hash');

    if (!token || !deviceHash) {
      return NextResponse.json({
        hasReservation: false,
        error: 'Missing token or device hash'
      }, { status: 400 });
    }

    // Get gift room ID from token
    const { data: room, error: roomError } = await supabase
      .from('gift_rooms')
      .select('id')
      .eq('token', token)
      .single();

    if (roomError || !room) {
      return NextResponse.json({
        hasReservation: false,
        error: 'Gift room not found'
      }, { status: 404 });
    }

    // Check for existing reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('*')
      .eq('room_id', (room as { id: string }).id)
      .eq('device_fingerprint', deviceHash)
      .single();

    if (reservationError && reservationError.code !== 'PGRST116') {
      console.error('Error checking reservation:', reservationError);
      return NextResponse.json({
        hasReservation: false,
        error: 'Failed to check reservation'
      }, { status: 500 });
    }

    return NextResponse.json({
      hasReservation: !!reservation,
      reservation: reservation || null
    });

  } catch (error) {
    console.error('Error checking existing reservation:', error);
    return NextResponse.json({
      hasReservation: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}