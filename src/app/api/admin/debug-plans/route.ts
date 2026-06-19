import { NextRequest, NextResponse } from 'next/server';
import { getMergedDataPlans, clearPlansCache } from '@/lib/api/merged-data-plans';
import { verifyToken } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { valid } = verifyToken(authHeader.split(' ')[1]);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    clearPlansCache();

    const { plans, meta } = await getMergedDataPlans(true);

    const stats = {
      MTN: plans.MTN.length,
      AIRTEL: plans.AIRTEL.length,
      GLO: plans.GLO.length,
      '9MOBILE': plans['9MOBILE'].length,
      total: meta.totalPlans,
    };

    return NextResponse.json({ success: true, stats, meta });
  } catch (error) {
    console.error('[DEBUG-PLANS] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
