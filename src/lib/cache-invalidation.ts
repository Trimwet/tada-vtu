"use client";

/**
 * Cache invalidation utility for TADA VTU
 * Ensures removed features don't persist in browser caches
 */

export function clearOldFeatureCaches() {
  if (typeof window === 'undefined') return;
  
  // Clear localStorage
  const oldKeys = [
    'gift-rooms-data',
    'favorites-list',
    'cable-providers',
    'electricity-discos',
    'betting-services',
    'hideBalance', // Keep this one
  ];
  
  oldKeys.forEach(key => {
    if (key !== 'hideBalance') { // Preserve user preferences
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore errors
      }
    }
  });
  
  // Clear old SWR caches
  if (window.caches) {
    window.caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        if (cacheName.includes('gift') || 
            cacheName.includes('favorite') || 
            cacheName.includes('cable') || 
            cacheName.includes('electricity') || 
            cacheName.includes('betting')) {
          window.caches.delete(cacheName);
        }
      });
    });
  }
  
  // Force reload SWR cache
  if (typeof window !== 'undefined' && window.location) {
    // Clear any URL-based caches
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    // Don't actually navigate, just clear cache
  }
}

// Auto-run on app load
if (typeof window !== 'undefined') {
  // Run once on load
  clearOldFeatureCaches();
  
  // Register service worker message
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({
        type: 'CLEAR_OLD_DATA'
      });
    });
  }
}