import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const MAINTENANCE_FILE = join(process.cwd(), '.maintenance');

export async function GET(request: NextRequest) {
  try {
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
      maintenanceMode: isMaintenanceMode 
    });

  } catch (error) {
    console.error('Error checking maintenance status:', error);
    return NextResponse.json({ 
      maintenanceMode: false 
    });
  }
}