import { DeviceFingerprint } from '@/types/gift-room';

/**
 * Generate a device fingerprint for gift room reservations
 * This helps prevent abuse while allowing legitimate users to access gifts
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      userAgent: 'server',
      screenResolution: '0x0',
      timezone: 'UTC',
      language: 'en',
      platform: 'server',
      hash: 'server-' + Date.now(),
    };
  }

  const fingerprint: DeviceFingerprint = {
    userAgent: navigator.userAgent || 'unknown',
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    language: navigator.language || 'en',
    platform: navigator.platform || 'unknown',
    hash: '',
  };

  // Generate hash from fingerprint components
  fingerprint.hash = generateFingerprintHash(fingerprint);

  return fingerprint;
}

/**
 * Generate a hash from fingerprint components
 */
function generateFingerprintHash(fingerprint: Omit<DeviceFingerprint, 'hash'>): string {
  const components = [
    fingerprint.userAgent,
    fingerprint.screenResolution,
    fingerprint.timezone,
    fingerprint.language,
    fingerprint.platform,
  ].join('|');

  return simpleHash(components);
}

/**
 * Simple hash function for client-side use
 * Not cryptographically secure, but sufficient for fingerprinting
 */
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Get or create a persistent device ID using localStorage
 * This provides additional stability across browser sessions
 */
export function getPersistentDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-' + Date.now();
  }

  const storageKey = 'tada_device_id';
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    // Generate new device ID
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
}

/**
 * Enhanced device fingerprint that combines multiple factors
 */
export function generateEnhancedFingerprint(): DeviceFingerprint {
  const baseFingerprint = generateDeviceFingerprint();
  const persistentId = getPersistentDeviceId();

  // Combine base fingerprint with persistent ID
  const enhancedComponents = [
    baseFingerprint.userAgent,
    baseFingerprint.screenResolution,
    baseFingerprint.timezone,
    baseFingerprint.language,
    baseFingerprint.platform,
    persistentId,
  ].join('|');

  return {
    ...baseFingerprint,
    hash: simpleHash(enhancedComponents),
  };
}

/**
 * Validate if two fingerprints are from the same device
 */
export function isSameDevice(fp1: DeviceFingerprint, fp2: DeviceFingerprint): boolean {
  return fp1.hash === fp2.hash;
}

/**
 * Get additional device information for enhanced security
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      cookiesEnabled: false,
      doNotTrack: false,
      onLine: false,
      touchSupport: false,
    };
  }

  return {
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    onLine: navigator.onLine,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  };
}

/**
 * Check if device fingerprinting is available
 */
export function isDeviceFingerprintingAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(
    navigator.userAgent &&
    screen.width &&
    screen.height &&
    typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function' &&
    navigator.language
  );
}

/**
 * Generate a fallback identifier when fingerprinting is not available
 */
export function generateFallbackIdentifier(): string {
  if (typeof window === 'undefined') {
    return 'server-fallback-' + Date.now();
  }

  // Use timestamp + random for fallback
  return 'fallback-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Main function to get device identifier for gift room reservations
 */
export function getDeviceIdentifier(): string {
  try {
    if (isDeviceFingerprintingAvailable()) {
      const fingerprint = generateEnhancedFingerprint();
      return fingerprint.hash;
    } else {
      return generateFallbackIdentifier();
    }
  } catch (error) {
    console.warn('Device fingerprinting failed, using fallback:', error);
    return generateFallbackIdentifier();
  }
}