import { NextResponse } from 'next/server';
import { getBanks } from '@/lib/api/flutterwave-transfer';

// Cache banks list for 24 hours
let cachedBanks: { id: number; code: string; name: string }[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// GET /api/withdrawal/banks - Get list of Nigerian banks
export async function GET() {
  try {
    // Return cached banks if available and not expired
    if (cachedBanks && Date.now() - cacheTime < CACHE_DURATION) {
      return NextResponse.json({
        status: 'success',
        data: cachedBanks,
      });
    }

    const banks = await getBanks();
    
    // Cache the result
    cachedBanks = banks;
    cacheTime = Date.now();

    return NextResponse.json({
      status: 'success',
      data: banks,
    });

  } catch (error) {
    console.error('Get banks error:', error);
    
    // Return cached banks even if expired, as fallback
    if (cachedBanks) {
      return NextResponse.json({
        status: 'success',
        data: cachedBanks,
        cached: true,
      });
    }

    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}
