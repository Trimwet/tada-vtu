import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import jwt from 'jsonwebtoken';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const MAINTENANCE_FILE = join(process.cwd(), '.maintenance');

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if maintenance file exists
    let isMaintenanceMode = false;
    try {
      const content = await readFile(MAINTENANCE_FILE, 'utf-8');
      isMaintenanceMode = content.trim() === 'true';
    } catch (error) {
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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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