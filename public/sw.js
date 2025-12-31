// TADA VTU Service Worker - Advanced Caching & Offline Support
const CACHE_NAME = 'tada-vtu-v1.3.0';
const STATIC_CACHE = 'tada-static-v1.3.0';
const DYNAMIC_CACHE = 'tada-dynamic-v1.3.0';
const API_CACHE = 'tada-api-v1.3.0';

// Critical resources to cache immediately (only guaranteed to exist)
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = [
  { pattern: '/api/user', strategy: 'networkFirst', ttl: 300000 }, // 5 minutes
  { pattern: '/api/data-plans', strategy: 'cacheFirst', ttl: 3600000 }, // 1 hour
  { pattern: '/api/inlomax/services', strategy: 'cacheFirst', ttl: 3600000 },
  { pattern: '/api/loyalty', strategy: 'networkFirst', ttl: 600000 }, // 10 minutes
];

// Install event - Cache critical resources with robust error handling
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets with individual error handling
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('[SW] Caching static assets');
        
        // Cache each asset individually to avoid failing the entire batch
        const cachePromises = STATIC_ASSETS.map(async (asset) => {
          try {
            const response = await fetch(asset);
            if (response.ok) {
              await cache.put(asset, response);
              console.log('[SW] Successfully cached:', asset);
            } else {
              console.warn('[SW] Failed to cache (bad response):', asset, response.status);
            }
          } catch (error) {
            console.warn('[SW] Failed to cache (network error):', asset, error.message);
            // Don't throw - continue with other assets
          }
        });
        
        // Wait for all cache attempts to complete (success or failure)
        await Promise.allSettled(cachePromises);
        console.log('[SW] Static asset caching completed');
        return Promise.resolve();
      }).catch((error) => {
        console.error('[SW] Failed to open static cache:', error);
        return Promise.resolve(); // Don't fail installation
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE
            ) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }).catch((error) => {
        console.error('[SW] Error cleaning up caches:', error);
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - Implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAssets(request));
  } else if (url.pathname.startsWith('/dashboard')) {
    event.respondWith(handleDashboardPages(request));
  } else {
    event.respondWith(handleGeneralRequests(request));
  }
});

// API Request Handler - Network First with Cache Fallback
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const apiPattern = API_CACHE_PATTERNS.find(p => url.pathname.includes(p.pattern));
  
  if (!apiPattern) {
    // Don't cache unknown API endpoints
    try {
      return await fetch(request);
    } catch (error) {
      console.log('[SW] API request failed:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Network Error', 
          message: 'Unable to reach server' 
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  try {
    const cache = await caches.open(API_CACHE);
    
    if (apiPattern.strategy === 'networkFirst') {
      try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
          // Cache successful responses
          const responseClone = networkResponse.clone();
          await cache.put(request, responseClone);
          
          // Set expiry metadata
          const expiryTime = Date.now() + apiPattern.ttl;
          await cache.put(`${request.url}:expiry`, new Response(expiryTime.toString()));
        }
        
        return networkResponse;
      } catch (error) {
        console.log('[SW] Network failed, trying cache:', error);
        
        // Check if cached response is still valid
        const cachedResponse = await cache.match(request);
        const expiryResponse = await cache.match(`${request.url}:expiry`);
        
        if (cachedResponse && expiryResponse) {
          const expiryTime = parseInt(await expiryResponse.text());
          if (Date.now() < expiryTime) {
            return cachedResponse;
          }
        }
        
        // Return offline fallback
        return new Response(
          JSON.stringify({ 
            error: 'Offline', 
            message: 'No network connection available' 
          }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } else if (apiPattern.strategy === 'cacheFirst') {
      // Cache first strategy for static data
      const cachedResponse = await cache.match(request);
      const expiryResponse = await cache.match(`${request.url}:expiry`);
      
      if (cachedResponse && expiryResponse) {
        const expiryTime = parseInt(await expiryResponse.text());
        if (Date.now() < expiryTime) {
          return cachedResponse;
        }
      }
      
      // Cache expired or not found, fetch from network
      try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          await cache.put(request, responseClone);
          
          const expiryTime = Date.now() + apiPattern.ttl;
          await cache.put(`${request.url}:expiry`, new Response(expiryTime.toString()));
        }
        
        return networkResponse;
      } catch (error) {
        return cachedResponse || new Response(
          JSON.stringify({ error: 'Service Unavailable' }), 
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    console.error('[SW] Cache operation failed:', error);
    // Fallback to network only
    return fetch(request);
  }
}

// Static Assets Handler - Cache First with error handling
async function handleStaticAssets(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      console.log('[SW] Failed to fetch static asset:', error);
      return new Response('Asset not available offline', { status: 503 });
    }
  } catch (error) {
    console.error('[SW] Static asset cache error:', error);
    return fetch(request); // Fallback to network
  }
}

// Dashboard Pages Handler - Network First with Cache Fallback
async function handleDashboardPages(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      console.log('[SW] Network failed for dashboard page, trying cache');
      
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Return offline page
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>TADA VTU - Offline</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: system-ui; 
                text-align: center; 
                padding: 2rem; 
                background: #0a0a0a;
                color: #fff;
              }
              .offline { color: #666; }
              button {
                background: #22c55e;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 0.5rem;
                cursor: pointer;
                margin-top: 1rem;
              }
            </style>
          </head>
          <body>
            <h1>You're offline</h1>
            <p class="offline">Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  } catch (error) {
    console.error('[SW] Dashboard page cache error:', error);
    return fetch(request); // Fallback to network
  }
}

// General Requests Handler
async function handleGeneralRequests(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      return cachedResponse || new Response('Page not available offline', { status: 503 });
    }
  } catch (error) {
    console.error('[SW] General request cache error:', error);
    return fetch(request); // Fallback to network
  }
}

// Background Sync for failed transactions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-transactions') {
    event.waitUntil(syncFailedTransactions());
  }
});

async function syncFailedTransactions() {
  try {
    // Get failed transactions from IndexedDB
    const failedTransactions = await getFailedTransactions();
    
    for (const transaction of failedTransactions) {
      try {
        const response = await fetch('/api/transactions/retry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction)
        });
        
        if (response.ok) {
          await removeFailedTransaction(transaction.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync transaction:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: data.tag || 'tada-notification',
      data: data.data,
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('[SW] Notification click error:', error);
      })
  );
});

// Helper functions for IndexedDB operations
async function getFailedTransactions() {
  // Implementation would use IndexedDB to store failed transactions
  return [];
}

async function removeFailedTransaction(id) {
  // Implementation would remove transaction from IndexedDB
  console.log('[SW] Removing failed transaction:', id);
}

console.log('[SW] Service Worker loaded successfully');