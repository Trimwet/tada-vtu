// API utilities for reliability and error handling

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

// Retry wrapper for API calls
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = true, onRetry } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        onRetry?.(attempt, lastError);
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}

// Check if error should not be retried
function isNonRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Don't retry validation errors, auth errors, or insufficient balance
    return (
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('insufficient') ||
      message.includes('not found') ||
      message.includes('forbidden')
    );
  }
  return false;
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Timeout wrapper
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([operation, timeoutPromise]);
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// Format error for user display
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Clean up technical error messages
    const message = error.message;
    
    if (message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (message.includes('500') || message.includes('Internal')) {
      return 'Server error. Please try again later.';
    }
    if (message.includes('503') || message.includes('unavailable')) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    
    return message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

// API response type
export interface ApiResponse<T = unknown> {
  status: boolean;
  message: string;
  data?: T;
}

// Type-safe API call wrapper
export async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    return {
      status: false,
      message: data.message || `HTTP ${response.status}: ${response.statusText}`,
    };
  }
  
  return data;
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
}

// Throttle utility
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limitMs);
    }
  };
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  if (phone.length === 11) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
  return phone;
}

// Mask sensitive data
export function maskPhone(phone: string): string {
  if (phone.length >= 8) {
    return phone.slice(0, 4) + '****' + phone.slice(-3);
  }
  return phone;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return local.slice(0, 2) + '***@' + domain;
}
