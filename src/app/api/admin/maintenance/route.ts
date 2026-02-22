import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const MAINTENANCE_FILE = join(process.cwd(), '.maintenance');

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
    const { valid, adminId } = verifyToken(token);
    
    if (!valid || !adminId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin exists
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    // Check if maintenance file exists
    let isMaintenanceMode = false;
    try {
      const content = await readFile(MAINTENANCE_FILE, 'utf-8');
      isMaintenanceMode = content.trim() === 'true';
    } catch {
      // File doesn't exist, maintenance mode is off
      isMaintenanceMode = false;
    }

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
    const { valid, adminId } = verifyToken(token);
    
    if (!valid || !adminId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin exists
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    const { maintenanceMode } = await request.json();
    
    if (typeof maintenanceMode !== 'boolean') {
      return NextResponse.json({ error: 'Invalid maintenance mode value' }, { status: 400 });
    }

    // Write maintenance status to file
    await writeFile(MAINTENANCE_FILE, maintenanceMode.toString(), 'utf-8');

    return NextResponse.json({ 
      success: true, 
      message: `Maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'}`,
      maintenanceMode 
    });

  } catch (error) {
    console.error('Error in maintenance POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}