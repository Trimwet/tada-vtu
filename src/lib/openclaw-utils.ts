// OpenClaw Integration Utilities
// Helper functions for OpenClaw API endpoints

/**
 * Standard success response format for OpenClaw endpoints
 */
export function openclawSuccess<T extends Record<string, unknown>>(
  data: T,
  message?: string
) {
  const response: Record<string, unknown> = {
    success: true,
    ...data,
  };
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

/**
 * Standard error response format for OpenClaw endpoints
 */
export function openclawError(
  message: string,
  code?: string,
  details?: unknown
) {
  const response: Record<string, unknown> = {
    success: false,
    message,
  };
  
  if (code) {
    response.code = code;
  }
  
  if (details) {
    response.details = details;
  }
  
  return response;
}

/**
 * Normalize Nigerian phone number to standard format
 * Handles various input formats and returns 11-digit format starting with 0
 */
export function normalizeNigerianPhone(phone: string): string | null {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle country code formats
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('+234')) {
    cleaned = '0' + cleaned.substring(4);
  }

  // Validate: must be 11 digits starting with 0
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned;
  }

  return null;
}

/**
 * Validate Nigerian phone number format
 */
export function isValidNigerianPhone(phone: string): boolean {
  const normalized = normalizeNigerianPhone(phone);
  return normalized !== null;
}

/**
 * Format amount in Nigerian Naira
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generate registration URL with pre-filled WhatsApp number
 */
export function getRegistrationUrl(whatsappNumber: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tadavtu.com';
  const normalized = normalizeNigerianPhone(whatsappNumber);
  const phone = normalized || whatsappNumber;
  
  return `${baseUrl}/register?ref=whatsapp&phone=${encodeURIComponent(phone)}`;
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitEnabled(): boolean {
  return process.env.OPENCLAW_RATE_LIMIT_ENABLED !== 'false';
}
