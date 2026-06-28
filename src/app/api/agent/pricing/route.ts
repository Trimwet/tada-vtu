// TADAPAY Agent Pricing Lookup Endpoint
// Returns available data plans for specified network

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { agentSuccess, agentError } from '@/lib/agent-utils';
import { getNetworkPlans } from '@/lib/api/merged-data-plans';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const SUPPORTED_NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const;
type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const networkParam = searchParams.get('network');

    if (!networkParam) {
      return NextResponse.json(
        agentError('Network parameter is required', 'MISSING_NETWORK'),
        { status: 400 }
      );
    }

    const network = networkParam.toUpperCase() as SupportedNetwork;

    if (!SUPPORTED_NETWORKS.includes(network)) {
      return NextResponse.json(
        agentError(
          `Unsupported network. Supported networks: ${SUPPORTED_NETWORKS.join(', ')}`,
          'INVALID_NETWORK'
        ),
        { status: 400 }
      );
    }

    const rateLimit = checkRateLimit(
      `agent:pricing:${network}`,
      RATE_LIMITS.agent
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        agentError(
          `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          'RATE_LIMIT_EXCEEDED'
        ),
        { status: 429 }
      );
    }

    const plans = await getNetworkPlans(network);

    if (!plans || plans.length === 0) {
      return NextResponse.json(
        agentError(
          `No plans available for ${network} at the moment. Please try again later.`,
          'NO_PLANS_AVAILABLE'
        ),
        { status: 503 }
      );
    }

    const formattedPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      size: plan.size,
      price: plan.price,
      validity: plan.validity,
      type: plan.type,
      description: plan.description,
    }));

    return NextResponse.json(
      agentSuccess({
        network,
        plans: formattedPlans,
        totalPlans: formattedPlans.length,
        currency: 'NGN',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[AGENT PRICING] Unexpected error:', error);
    return NextResponse.json(
      agentError('Failed to retrieve pricing information', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withAgentAuth(handler);
