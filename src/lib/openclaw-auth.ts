// OpenClaw API Authentication Middleware
// Validates API key for OpenClaw integration endpoints

import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates OpenClaw API key from request headers
 * @param request - Next.js request object
 * @returns Object with isValid flag and optional error response
 */
export function validateOpenClawAuth(request: NextRequest): {
  isValid: boolean;
  error?: NextResponse;
} {
  const apiKey = process.env.OPENCLAW_API_KEY;

  if (!apiKey) {
    console.error('[OPENCLAW AUTH] OPENCLAW_API_KEY not configured');
    return {
      isValid: false,
      error: NextResponse.json(
        {
          success: false,
          message: 'OpenClaw integration not configured',
          code: 'AUTH_NOT_CONFIGURED',
        },
        { status: 500 }
      ),
    };
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
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

  // Support both "Bearer <key>" and direct key formats
  const providedKey = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  if (providedKey !== apiKey) {
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
 * Middleware wrapper for OpenClaw endpoints
 * Validates authentication before allowing request to proceed
 */
export function withOpenClawAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = validateOpenClawAuth(request);

    if (!authResult.isValid) {
      return authResult.error!;
    }

    return handler(request);
  };
}
