// Service Worker Cache Cleanup for TADA VTU
// Removes caches from old features

const CACHE_VERSION = 'v2.0.0-streamlined';
const OLD_CACHE_PATTERNS = [
  'gift-',
  'favorites-',
  'cable-',
  'electricity-',
  'betting-'
];

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old version caches
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          
          // Delete caches for removed features
          for (const pattern of OLD_CACHE_PATTERNS) {
            if (cacheName.includes(pattern)) {
              console.log('Deleting removed feature cache:', cacheName);
              return caches.delete(cacheName);
            }
          }
        })
      );
    })
  );
});

// Clear localStorage of old feature data
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_OLD_DATA') {
    // Clear old localStorage keys
    const keysToRemove = [
      'gift-rooms',
      'favorites-data',
      'cable-services',
      'electricity-providers',
      'betting-accounts'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore errors
      }
    });
  }
});