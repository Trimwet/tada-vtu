import { NextRequest, NextResponse } from 'next/server';
import { getMergedDataPlans, clearPlansCache } from '@/lib/api/merged-data-plans';

export async function GET(request: NextRequest) {
  try {
    // Clear cache and force fresh fetch
    clearPlansCache();
    
    const { plans, meta } = await getMergedDataPlans(true);
    
    const stats = {
      MTN: plans.MTN.length,
      AIRTEL: plans.AIRTEL.length,
      GLO: plans.GLO.length,
      '9MOBILE': plans['9MOBILE'].length,
      total: meta.totalPlans,
    };
    
    return NextResponse.json({
      success: true,
      stats,
      meta,
      message: 'Check server logs for detailed debug information'
    });
  } catch (error) {
    console.error('[DEBUG-PLANS] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
