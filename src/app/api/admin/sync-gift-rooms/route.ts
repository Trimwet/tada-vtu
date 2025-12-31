import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as any).role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Run the sync function
    const { data: updatedRooms, error: syncError } = await supabase.rpc('sync_gift_room_counts');

    if (syncError) {
      console.error('Error syncing gift room counts:', syncError);
      return NextResponse.json({
        success: false,
        error: 'Failed to sync gift room counts'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        updated_rooms: updatedRooms,
        message: `Successfully synced ${updatedRooms} gift rooms`
      }
    });

  } catch (error) {
    console.error('Error in sync gift rooms:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}