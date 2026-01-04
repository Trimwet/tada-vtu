import { NextRequest, NextResponse } from 'next/server';
import {
  getMergedDataPlans,
  getNetworkPlans,
  getBestDeals,
  getPlansByType,
  clearPlansCache,
  getProviderHealthStatus,
  type Provider,
} from '@/lib/api/merged-data-plans';

// GET /api/data-plans - Get data plans
// Query params:
//   network=MTN - Filter by network
//   type=SME - Filter by plan type
//   best=true - Get best deals only
//   refresh=true - Force cache refresh
//   limit=10 - Limit results

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network')?.toUpperCase();
    const type = searchParams.get('type')?.toUpperCase();
    const best = searchParams.get('best') === 'true';
    const refresh = searchParams.get('refresh') === 'true';
    const limit = parseInt(searchParams.get('limit') || '0') || undefined;

    // Force refresh if requested
    if (refresh) {
      clearPlansCache();
    }

    // Get best deals for a network
    if (network && best) {
      const deals = await getBestDeals(network, limit || 10);
      const { meta } = await getMergedDataPlans();

      return NextResponse.json({
        success: true,
        network,
        plans: deals,
        count: deals.length,
        meta,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    // Get plans by type for a network
    if (network && type) {
      const plansByType = await getPlansByType(network);
      const plans = plansByType[type] || [];
      const { meta } = await getMergedDataPlans();

      return NextResponse.json({
        success: true,
        network,
        type,
        plans: limit ? plans.slice(0, limit) : plans,
        count: plans.length,
        meta,
      });
    }

    // Get all plans for a specific network
    if (network) {
      const plans = await getNetworkPlans(network);
      const plansByType = await getPlansByType(network);
      const { meta } = await getMergedDataPlans();

      return NextResponse.json({
        success: true,
        network,
        plans: limit ? plans.slice(0, limit) : plans,
        count: plans.length,
        types: Object.keys(plansByType),
        byType: plansByType,
        meta,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    // Get all plans for all networks
    const { plans, meta } = await getMergedDataPlans(refresh);

    const stats = {
      MTN: plans.MTN.length,
      AIRTEL: plans.AIRTEL.length,
      GLO: plans.GLO.length,
      '9MOBILE': plans['9MOBILE'].length,
      total: meta.totalPlans,
    };

    return NextResponse.json({
      success: true,
      plans,
      stats,
      meta,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[DATA-PLANS API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data plans',
        meta: {
          providers: getProviderHealthStatus(),
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/data-plans - Admin actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, provider } = body;

    if (action === 'reset-circuit' && provider === 'inlomax') {
      // In simulation for the new simple model
      return NextResponse.json({
        success: true,
        message: `Circuit breaker reset for ${provider}`,
        providers: getProviderHealthStatus(),
      });
    }

    if (action === 'clear-cache') {
      clearPlansCache();
      return NextResponse.json({
        success: true,
        message: 'Cache cleared',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
