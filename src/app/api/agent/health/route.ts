// TADAPAY Agent Health Check Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { agentSuccess } from '@/lib/agent-utils';

async function handler(_request: NextRequest) {
  return NextResponse.json(
    agentSuccess({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    })
  );
}

export const GET = withAgentAuth(handler);
