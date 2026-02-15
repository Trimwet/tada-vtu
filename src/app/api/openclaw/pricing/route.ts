// OpenClaw Pricing Lookup Endpoint
// Returns available data plans for specified network

import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { openclawSuccess, openclawError } from '@/lib/openclaw-utils';
import { getNetworkPlans } from '@/lib/api/merged-data-plans';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const SUPPORTED_NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const;
type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

async function handler(request: NextRequest) {
  try {
    // Get network from query params
    const { searchParams } = new URL(request.url);
    const networkParam = searchParams.get('network');

    if (!networkParam) {
      return NextResponse.json(
        openclawError(
          'Network parameter is required',
          'MISSING_NETWORK'
        ),
        { status: 400 }
      );
    }

    // Normalize and validate network
    const network = networkParam.toUpperCase() as SupportedNetwork;

    if (!SUPPORTED_NETWORKS.includes(network)) {
      return NextResponse.json(
        openclawError(
          `Unsupported network. Supported networks: ${SUPPORTED_NETWORKS.join(', ')}`,
          'INVALID_NETWORK'
        ),
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      `openclaw:pricing:${network}`,
      RATE_LIMITS.openclaw
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        openclawError(
          `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          'RATE_LIMIT_EXCEEDED'
        ),
        { status: 429 }
      );
    }

    // Get plans from merged-data-plans service
    const plans = await getNetworkPlans(network);

    if (!plans || plans.length === 0) {
      return NextResponse.json(
        openclawError(
          `No plans available for ${network} at the moment. Please try again later.`,
          'NO_PLANS_AVAILABLE'
        ),
        { status: 503 }
      );
    }

    // Transform plans to OpenClaw format
    const formattedPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      size: plan.size,
      price: plan.price,
      validity: plan.validity,
      type: plan.type,
      description: plan.description,
    }));

    // Return plans
    return NextResponse.json(
      openclawSuccess({
        network,
        plans: formattedPlans,
        totalPlans: formattedPlans.length,
        currency: 'NGN',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[OPENCLAW PRICING] Unexpected error:', error);
    return NextResponse.json(
      openclawError(
        'Failed to retrieve pricing information',
        'INTERNAL_ERROR'
      ),
      { status: 500 }
    );
  }
}

export const GET = withOpenClawAuth(handler);
