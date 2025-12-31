import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

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
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Use admin client to bypass RLS and manually filter by user
    // 1. Get rooms CREATED by this user
    let sentQuery = adminClient
      .from('gift_rooms')
      .select('id, sender_id, type, capacity, amount, total_amount, message, token, status, joined_count, claimed_count, created_at, expires_at')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (status && ['active', 'full', 'expired', 'completed'].includes(status)) {
      sentQuery = sentQuery.eq('status', status);
    }

    // 2. Get rooms JOINED by this user (via reservations)
    const { data: reservations } = await adminClient
      .from('reservations')
      .select('room_id')
      .eq('user_id', user.id);

    const joinedRoomIds = (reservations || []).map((r: { room_id: string }) => r.room_id);

    // Execute sent rooms query
    const { data: sentRooms, error: sentError } = await sentQuery;

    if (sentError) {
      console.error('Error fetching sent rooms:', sentError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch gift rooms'
      }, { status: 500 });
    }

    // Get joined rooms if any
    let joinedRooms: typeof sentRooms = [];
    if (joinedRoomIds.length > 0) {
      let joinedQuery = adminClient
        .from('gift_rooms')
        .select('id, sender_id, type, capacity, amount, total_amount, message, token, status, joined_count, claimed_count, created_at, expires_at')
        .in('id', joinedRoomIds)
        .order('created_at', { ascending: false });

      if (status && ['active', 'full', 'expired', 'completed'].includes(status)) {
        joinedQuery = joinedQuery.eq('status', status);
      }

      const { data, error } = await joinedQuery;
      if (error) {
        console.error('Error fetching joined rooms:', error);
      } else {
        joinedRooms = data || [];
      }
    }

    // Combine and deduplicate
    const allRooms = [...(sentRooms || []), ...joinedRooms];
    const uniqueRooms = Array.from(
      new Map(allRooms.map(room => [room.id, room])).values()
    );

    // Sort by created_at desc
    uniqueRooms.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    const paginatedRooms = uniqueRooms.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedRooms
    });

  } catch (error) {
    console.error('Error getting user gift rooms:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
