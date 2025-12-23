import { NextResponse } from 'next/server';
import { getBanksList } from '@/lib/api/provider-router';

// GET /api/smeplug/banks - Get list of supported banks
export async function GET() {
  try {
    const banks = await getBanksList();
    
    return NextResponse.json({
      status: 'success',
      data: banks,
    });
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch banks',
      },
      { status: 500 }
    );
  }
}
