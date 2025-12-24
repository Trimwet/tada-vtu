import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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
    const status = searchParams.get('status'); // Filter by status
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('gift_rooms')
      .select('*')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status && ['active', 'full', 'expired', 'completed'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: rooms, error: roomsError } = await query;

    if (roomsError) {
      console.error('Error fetching user gift rooms:', roomsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch gift rooms'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: rooms || []
    });

  } catch (error) {
    console.error('Error getting user gift rooms:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}