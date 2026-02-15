// Simple in-memory rate limiter for API routes
// For production, consider using Redis or Upstash

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Time window in milliseconds
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitMap.get(key);
  
  // Create new entry if doesn't exist or window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitMap.set(key, entry);
  }
  
  entry.count++;
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = Math.max(0, entry.resetTime - now);
  
  return {
    allowed: entry.count <= config.maxRequests,
    remaining,
    resetIn,
  };
}

// Preset configurations
export const RATE_LIMITS = {
  // Auth endpoints - stricter
  auth: { maxRequests: 5, windowMs: 60000 },
  
  // Transaction endpoints - moderate
  transaction: { maxRequests: 10, windowMs: 60000 },
  
  // General API - relaxed
  api: { maxRequests: 30, windowMs: 60000 },
  
  // Webhook - very relaxed
  webhook: { maxRequests: 100, windowMs: 60000 },
  
  // OpenClaw endpoints - moderate (per user)
  openclaw: { maxRequests: 20, windowMs: 60000 },
  
  // OpenClaw purchases - stricter (5 purchases per 10 minutes)
  openclawPurchase: { maxRequests: 5, windowMs: 10 * 60000 },
};
