import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // This endpoint should be called by a cron job or scheduled task
    // For security, we can add an API key check
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_API_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Run the cleanup function
    const { data: expiredCount, error: cleanupError } = await supabase
      .rpc('cleanup_expired_gift_rooms');

    if (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
      return NextResponse.json({
        success: false,
        error: 'Cleanup failed',
        details: cleanupError.message
      }, { status: 500 });
    }

    // Also clean up old activities (keep only last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: activityCleanupError } = await supabase
      .from('gift_room_activities')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (activityCleanupError) {
      console.warn('Error cleaning up old activities:', activityCleanupError);
    }

    return NextResponse.json({
      success: true,
      data: {
        expired_rooms_processed: expiredCount || 0,
        cleanup_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Also allow GET for manual testing (in development only)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'Not available in production'
    }, { status: 404 });
  }

  return POST(request);
}