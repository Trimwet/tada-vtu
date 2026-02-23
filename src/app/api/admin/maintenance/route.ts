import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceStatus, setMaintenanceStatus } from '@/lib/maintenance-cache';

// Verify admin token (same as dashboard)
function verifyToken(token: string): { valid: boolean; adminId?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return { valid: false };
    }
    return { valid: true, adminId: payload.id };
  } catch {
    return { valid: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { valid } = verifyToken(token);
    
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check maintenance mode from shared cache or environment variable
    const isMaintenanceMode = getMaintenanceStatus();

    return NextResponse.json({ 
      success: true, 
      maintenanceMode: isMaintenanceMode 
    });

  } catch (error) {
    console.error('Error in maintenance GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { valid } = verifyToken(token);
    
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { maintenanceMode } = await request.json();
    
    if (typeof maintenanceMode !== 'boolean') {
      return NextResponse.json({ error: 'Invalid maintenance mode value' }, { status: 400 });
    }

    // Store in shared cache (temporary solution for serverless)
    setMaintenanceStatus(maintenanceMode);

    return NextResponse.json({ 
      success: true, 
      message: `Maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'}`,
      maintenanceMode,
      note: 'Setting is temporary and will reset on next deployment. For permanent setting, update MAINTENANCE_MODE environment variable in Vercel.'
    });

  } catch (error) {
    console.error('Error in maintenance POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}