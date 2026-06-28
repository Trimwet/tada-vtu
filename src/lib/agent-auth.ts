// TADAPAY Agent API Authentication Middleware
// Validates the shared CORE_SECRET for first-party agent integrations
// (WhatsApp bot, future Telegram bot, etc). Uses the same secret as the
// Go Core backend and Eve channel auth — one secret, one rotation point.

import { NextRequest, NextResponse } from 'next/server';

export function validateAgentAuth(request: NextRequest): {
  isValid: boolean;
  error?: NextResponse;
} {
  const secret = process.env.CORE_SECRET;

  if (!secret) {
    console.error('[AGENT AUTH] CORE_SECRET not configured');
    return {
      isValid: false,
      error: NextResponse.json(
        {
          success: false,
          message: 'Agent integration not configured',
          code: 'AUTH_NOT_CONFIGURED',
        },
        { status: 500 }
      ),
    };
  }

  const authHeader = request.headers.get('authorization');
  const coreSecretHeader = request.headers.get('x-core-secret');

  // Support both x-core-secret (matches Core/Eve convention) and
  // Authorization: Bearer <secret> (matches generic API client conventions)
  const providedSecret =
    coreSecretHeader ||
    (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader);

  if (!providedSecret) {
    return {
      isValid: false,
      error: NextResponse.json(
        {
          success: false,
          message: 'Missing authentication credentials',
          code: 'AUTH_MISSING',
        },
        { status: 401 }
      ),
    };
  }

  if (providedSecret !== secret) {
    return {
      isValid: false,
      error: NextResponse.json(
        {
          success: false,
          message: 'Invalid authentication credentials',
          code: 'AUTH_INVALID',
        },
        { status: 401 }
      ),
    };
  }

  return { isValid: true };
}

/**
 * Middleware wrapper for /api/agent/* endpoints.
 * Validates CORE_SECRET before allowing the request to proceed.
 */
export function withAgentAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = validateAgentAuth(request);

    if (!authResult.isValid) {
      return authResult.error!;
    }

    return handler(request);
  };
}
