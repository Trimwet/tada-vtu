// OpenClaw Health Check Endpoint
// Simple endpoint to verify OpenClaw integration is working

import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { openclawSuccess } from '@/lib/openclaw-utils';

async function handler(request: NextRequest) {
  return NextResponse.json(
    openclawSuccess({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    })
  );
}

export const GET = withOpenClawAuth(handler);
