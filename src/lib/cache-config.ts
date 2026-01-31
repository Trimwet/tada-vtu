// Cache-busting configuration for TADA VTU
// Ensures removed features are not cached

export const CACHE_BUSTING = {
  // Version bump to invalidate all caches after cleanup
  APP_VERSION: '2.0.0-streamlined',
  BUILD_ID: Date.now().toString(),
  
  // Cache keys to invalidate
  INVALIDATE_KEYS: [
    'gift-*',
    'favorites-*', 
    'cable-*',
    'electricity-*',
    'betting-*'
  ],
  
  // SWR cache configuration
  SWR_CONFIG: {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 1000, // Short deduping for real-time updates
    focusThrottleInterval: 5000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  },
  
  // Browser cache headers
  CACHE_HEADERS: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};