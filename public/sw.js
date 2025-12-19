// Service Worker for TADA VTU - Advanced Caching & Performance
// IMPORTANT: Increment this version on each deployment to bust caches
const SW_VERSION = '2';
const CACHE_NAME = `tada-vtu-v${SW_VERSION}`;
const DYNAMIC_CACHE = `tada-vtu-dynamic-v${SW_VERSION}`;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Assets to cache immediately on install (only truly static assets)
const STATIC_ASSETS = [
  '/logo-icon.svg',
  '/logo.svg',
  '/logo-dark.svg',
  '/manifest.json',
  '/offline.html'
];

// Patterns for resources to cache
const CACHE_PATTERNS = {
  // Cache-first strategy (only immutable static assets like images/fonts)
  cacheFirst: [
    /\.(?:woff2?|ttf|otf|eot)$/,
    /\/fonts\//,
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/
  ],
  // Network-first strategy (API calls, dynamic content, JS/CSS)
  networkFirst: [
    /\/api\//,
    /\/_next\/data\//,
    /\/_next\/static\//,  // JS/CSS chunks - network first to avoid stale code
    /\.(?:css|js)$/,
    /\.json$/
  ],
  // Stale-while-revalidate strategy (pages - but not RSC payloads)
  staleWhileRevalidate: [],
  // Never cache - critical for RSC and real-time data
  neverCache: [
    /\/api\/auth/,
    /\/api\/admin/,
    /\/api\/flutterwave/,
    /\/api\/inlomax\/.*\/(airtime|data|cable|electricity|betting)/,
    /socket\.io/,
    /hot-update/,
    /\.rsc$/,           // RSC payloads
    /\?_rsc=/,          // RSC query params
    /\/dashboard/,      // Dashboard pages - always fresh
    /\/profile/,
    /\/transactions/,
    /\/rewards/
  ]
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        // Add offline fallback page first
        return cache.addAll(['/offline.html']).catch(err => {
          console.log('[SW] Could not cache offline page:', err);
        }).then(() => {
          // Then try to cache other static assets
          return Promise.all(
            STATIC_ASSETS.filter(asset => asset !== '/offline.html').map(asset => {
              return cache.add(asset).catch(err => {
                console.log(`[SW] Could not cache ${asset}:`, err);
              });
            })
          );
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches and force refresh clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v' + SW_VERSION);

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete ALL old caches that don't match current version
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
    .then(() => {
      // Notify all clients to refresh if they have stale code
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
        });
      });
    })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // Skip if should never cache
  if (CACHE_PATTERNS.neverCache.some(pattern => pattern.test(url.pathname))) {
    return;
  }

  // Determine caching strategy
  let strategy = 'networkFirst'; // default

  if (CACHE_PATTERNS.cacheFirst.some(pattern => pattern.test(url.pathname))) {
    strategy = 'cacheFirst';
  } else if (CACHE_PATTERNS.staleWhileRevalidate.some(pattern => pattern.test(url.pathname))) {
    strategy = 'staleWhileRevalidate';
  }

  switch (strategy) {
    case 'cacheFirst':
      event.respondWith(cacheFirstStrategy(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidateStrategy(request));
      break;
    default:
      event.respondWith(networkFirstStrategy(request));
  }
});

// Cache-first strategy - ideal for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Return from cache, but update in background
      fetchAndCache(request, CACHE_NAME);
      return cachedResponse;
    }

    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache-first strategy failed:', error);
    // If both cache and network fail, return offline page
    const cachedOffline = await caches.match('/offline.html');
    return cachedOffline || new Response('Offline', { status: 503 });
  }
}

// Network-first strategy - ideal for dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetchWithTimeout(request, 3000);
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());

      // Clean old entries from dynamic cache
      cleanDynamicCache();
    }
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cachedOffline = await caches.match('/offline.html');
      return cachedOffline || new Response('Offline', { status: 503 });
    }

    return new Response('Network error', { status: 503 });
  }
}

// Stale-while-revalidate strategy - serve from cache, update in background
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse || fetchPromise || new Response('Offline', { status: 503 });
}

// Fetch with timeout
function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

// Background fetch and cache
async function fetchAndCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silent fail - this is background update
  }
}

// Clean old entries from dynamic cache
async function cleanDynamicCache() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();
  const now = Date.now();

  // Keep only last 50 dynamic entries or entries less than 7 days old
  if (requests.length > 50) {
    const toDelete = requests.slice(0, requests.length - 50);
    await Promise.all(toDelete.map(request => cache.delete(request)));
  }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_ASSETS') {
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(event.data.assets);
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
});

// ==========================================
// PUSH NOTIFICATIONS
// ==========================================

// Handle push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'TADA VTU',
    body: 'You have a new notification!',
    icon: '/logo-icon.svg',
    badge: '/logo-icon.svg',
    tag: 'default',
    data: { url: '/dashboard' },
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.log('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo-icon.svg',
    badge: data.badge || '/logo-icon.svg',
    tag: data.tag || 'tada-notification',
    data: data.data || { url: '/dashboard' },
    vibrate: [100, 50, 100],
    requireInteraction: data.tag === 'gift',
    actions: data.actions || [],
    // Renotify if same tag
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  // Get the URL to open
  let urlToOpen = '/dashboard';
  
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }

  // Handle action buttons
  if (event.action === 'open') {
    // Open gift action
    urlToOpen = '/dashboard/send-gift?tab=received';
  } else if (event.action === 'later') {
    // Just close the notification
    return;
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes('tadavtu.com') && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
  // Could track analytics here
});

// Periodic cache cleanup (every 24 hours when SW is active)
setInterval(() => {
  cleanDynamicCache();
}, 24 * 60 * 60 * 1000);

console.log('[SW] Service Worker loaded');
