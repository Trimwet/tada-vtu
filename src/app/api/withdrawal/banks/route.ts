import { NextResponse } from 'next/server';
import { getBanks } from '@/lib/api/flutterwave';

export async function GET() {
  try {
    const response = await getBanks('NG');
    
    if (response.status !== 'success' || !response.data) {
      return NextResponse.json(
        { error: 'Failed to fetch banks' },
        { status: 500 }
      );
    }

    // Return sorted banks
    const banks = response.data.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({ banks });
  } catch (error) {
    console.error('Get banks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}
