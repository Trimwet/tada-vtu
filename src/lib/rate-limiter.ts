/**
 * Rate Limiting & Brute Force Protection
 * Implements progressive delays and account lockout
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// In-memory store (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  PROGRESSIVE_DELAYS: [0, 1000, 2000, 5000, 10000], // ms delays after each attempt
};

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  retryAfter?: number;
  attemptsRemaining?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous attempts
  if (!entry) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return { allowed: true, attemptsRemaining: RATE_LIMIT_CONFIG.MAX_ATTEMPTS - 1 };
  }

  // Check if account is locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Reset if window expired
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.WINDOW_MS) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return { allowed: true, attemptsRemaining: RATE_LIMIT_CONFIG.MAX_ATTEMPTS - 1 };
  }

  // Increment attempts
  entry.attempts++;
  entry.lastAttempt = now;

  // Lock account if max attempts exceeded
  if (entry.attempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
    entry.lockedUntil = now + RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS;
    rateLimitStore.set(identifier, entry);
    const retryAfter = Math.ceil(RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS / 1000);
    return { allowed: false, retryAfter };
  }

  rateLimitStore.set(identifier, entry);
  return {
    allowed: true,
    attemptsRemaining: RATE_LIMIT_CONFIG.MAX_ATTEMPTS - entry.attempts,
  };
}

/**
 * Get progressive delay based on attempt count
 */
export function getProgressiveDelay(identifier: string): number {
  const entry = rateLimitStore.get(identifier);
  if (!entry) return 0;

  const attemptIndex = Math.min(
    entry.attempts - 1,
    RATE_LIMIT_CONFIG.PROGRESSIVE_DELAYS.length - 1
  );
  return RATE_LIMIT_CONFIG.PROGRESSIVE_DELAYS[attemptIndex] || 0;
}

/**
 * Reset rate limit for identifier (call on successful auth)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Cleanup expired entries (run periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (
      now - entry.firstAttempt > RATE_LIMIT_CONFIG.WINDOW_MS &&
      (!entry.lockedUntil || now > entry.lockedUntil)
    ) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

// ── WhatsApp-specific rate limiter ───────────────────────────────────────────
// Normal WhatsApp conversations are multi-turn: balance check + plan lookup +
// confirmation + buy = 6+ messages easily. The generic checkRateLimit (5
// attempts → 30-min lockout) would block legitimate users within one flow.
//
// This implementation uses a simple sliding-window counter:
//   - 30 messages per 15-minute window
//   - No lockout — just silently drops once the limit is hit
//   - Resets automatically when the window expires

const WA_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const WA_MAX_MESSAGES = 30;
const waStore = new Map<string, { count: number; windowStart: number }>();

export function checkWhatsAppRateLimit(phoneNumber: string): boolean {
  const now = Date.now();
  const entry = waStore.get(phoneNumber);

  if (!entry || now - entry.windowStart > WA_WINDOW_MS) {
    // New window
    waStore.set(phoneNumber, { count: 1, windowStart: now });
    return true;
  }

  entry.count++;
  if (entry.count > WA_MAX_MESSAGES) return false;

  waStore.set(phoneNumber, entry);
  return true;
}

// Include waStore in the periodic cleanup
const _origCleanup = cleanupExpiredEntries;
function _cleanupAll(): void {
  _origCleanup();
  const now = Date.now();
  for (const [phone, entry] of waStore) {
    if (now - entry.windowStart > WA_WINDOW_MS) waStore.delete(phone);
  }
}
setInterval(_cleanupAll, 5 * 60 * 1000);
