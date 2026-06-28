// TADAPAY Agent User Balance Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { agentSuccess, agentError, formatNaira } from '@/lib/agent-utils';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        agentError('userId is required', 'MISSING_USER_ID'),
        { status: 400 }
      );
    }

    const rateLimit = checkRateLimit(
      `agent:balance:${userId}`,
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

    const supabase = createAdminClient();

    type ProfileData = { id: string; balance: number; is_active: boolean };

    const { data, error } = await supabase
      .from('profiles')
      .select('id, balance, is_active')
      .eq('id', userId)
      .single<ProfileData>();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          agentError('User not found', 'USER_NOT_FOUND'),
          { status: 404 }
        );
      }
      console.error('[AGENT BALANCE] DB error:', error);
      return NextResponse.json(
        agentError('Failed to query balance', 'DATABASE_ERROR'),
        { status: 500 }
      );
    }

    if (!data?.is_active) {
      return NextResponse.json(
        agentError('Account is inactive. Please contact support.', 'ACCOUNT_INACTIVE'),
        { status: 403 }
      );
    }

    const balance = data.balance || 0;
    return NextResponse.json(
      agentSuccess({ balance, currency: 'NGN', formatted: formatNaira(balance) }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[AGENT BALANCE] Unexpected error:', error);
    return NextResponse.json(
      agentError('An unexpected error occurred', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withAgentAuth(handler);
