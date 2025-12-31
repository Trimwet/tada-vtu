import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('API: Auth user:', user?.id, 'Auth error:', authError);

    if (authError || !user) {
      console.log('API: Authentication failed');
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('API: Querying gift_rooms for user:', user.id);

    // 1. Get rooms created by user (Sent)
    let sentQuery = supabase
      .from('gift_rooms')
      .select('id, sender_id, type, capacity, amount, total_amount, message, token, status, joined_count, claimed_count, created_at, expires_at')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    // Add status filter if provided
    if (status && ['active', 'full', 'expired', 'completed'].includes(status)) {
      sentQuery = sentQuery.eq('status', status);
    }

    // 2. Get rooms joined by user (Received/Joined)
    // First get the reservation room_ids
    const { data: reservations } = await supabase
      .from('reservations')
      .select('room_id')
      .eq('user_id', user.id);

    const joinedRoomIds = (reservations as any[])?.map(r => r.room_id) || [];

    let joinedQuery = supabase
      .from('gift_rooms')
      .select('id, sender_id, type, capacity, amount, total_amount, message, token, status, joined_count, claimed_count, created_at, expires_at')
      .in('id', joinedRoomIds)
      .order('created_at', { ascending: false });

    if (status && ['active', 'full', 'expired', 'completed'].includes(status)) {
      joinedQuery = joinedQuery.eq('status', status);
    }

    // Execute queries in parallel
    const [sentResult, joinedResult] = await Promise.all([sentQuery, joinedQuery]);

    if (sentResult.error) {
      console.error('Error fetching sent rooms:', sentResult.error);
      throw sentResult.error;
    }

    if (joinedResult.error) {
      console.error('Error fetching joined rooms:', joinedResult.error);
      throw joinedResult.error;
    }

    // Combine and deduplicate (in case user joined their own room, though we prevent that)
    const allRooms = [...(sentResult.data || []), ...(joinedResult.data || [])] as any[];

    // Deduplicate by ID
    const uniqueRooms = Array.from(new Map(allRooms.map(room => [room.id, room])).values());

    // Sort combined results by created_at desc
    uniqueRooms.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply pagination manually since we combined results
    const paginatedRooms = uniqueRooms.slice(offset, offset + limit);

    console.log('API: Returning rooms:', paginatedRooms.length, 'total unique:', uniqueRooms.length);
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