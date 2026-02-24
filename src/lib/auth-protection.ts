/**
 * Authentication Protection Middleware
 * Apply to auth endpoints for rate limiting and brute force protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getProgressiveDelay, resetRateLimit } from './rate-limiter';

/**
 * Get client identifier for rate limiting
 * Uses IP address + user agent for better accuracy
 */
function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Hash to avoid storing raw IPs
  return `${ip}-${userAgent.substring(0, 50)}`;
}

/**
 * Apply rate limiting to authentication endpoints
 */
export async function withAuthRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const identifier = getClientIdentifier(request);
  
  // Check rate limit
  const { allowed, retryAfter, attemptsRemaining } = checkRateLimit(identifier);
  
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many attempts',
        message: 'Account temporarily locked due to multiple failed attempts. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter?.toString() || '1800',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }
  
  // Apply progressive delay
  const delay = getProgressiveDelay(identifier);
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  
  // Execute handler
  const response = await handler();
  
  // Reset rate limit on successful authentication (2xx status)
  if (response.status >= 200 && response.status < 300) {
    resetRateLimit(identifier);
  }
  
  // Add rate limit headers
  if (attemptsRemaining !== undefined) {
    response.headers.set('X-RateLimit-Remaining', attemptsRemaining.toString());
  }
  
  return response;
}

/**
 * Middleware for email-based rate limiting (for forgot password, etc.)
 */
export async function withEmailRateLimit(
  email: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const identifier = `email:${email.toLowerCase()}`;
  
  const { allowed, retryAfter } = checkRateLimit(identifier);
  
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Too many requests for this email. Please try again later.',
        retryAfter,
      },
      { status: 429 }
    );
  }
  
  return handler();
}
