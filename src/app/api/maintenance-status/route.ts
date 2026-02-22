import { NextRequest, NextResponse } from 'next/server';

// This should match the cache from the admin endpoint
// In a real production app, you'd use Redis or a database
// For now, we'll check environment variable as fallback
export async function GET(request: NextRequest) {
  try {
    // Check environment variable (can be set in Vercel dashboard)
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

    return NextResponse.json({ 
      maintenanceMode: isMaintenanceMode 
    });

  } catch (error) {
    console.error('Error checking maintenance status:', error);
    return NextResponse.json({ 
      maintenanceMode: false 
    });
  }
}