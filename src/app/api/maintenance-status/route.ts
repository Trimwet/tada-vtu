import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceStatus, setMaintenanceStatus } from '@/lib/maintenance-cache';

export async function GET(request: NextRequest) {
  try {
    const isMaintenanceMode = getMaintenanceStatus();

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

// Allow admin to update cache from this endpoint too
export async function POST(request: NextRequest) {
  try {
    const { maintenanceMode } = await request.json();
    
    if (typeof maintenanceMode !== 'boolean') {
      return NextResponse.json({ error: 'Invalid maintenance mode value' }, { status: 400 });
    }

    // Update the shared cache
    setMaintenanceStatus(maintenanceMode);

    return NextResponse.json({ 
      success: true,
      maintenanceMode 
    });

  } catch (error) {
    console.error('Error updating maintenance status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}