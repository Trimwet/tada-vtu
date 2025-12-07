// Service Worker for TADA VTU - Advanced Caching & Performance
const CACHE_NAME = 'tada-vtu-v1';
const DYNAMIC_CACHE = 'tada-vtu-dynamic-v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/logo-icon.svg',
  '/logo.svg',
  '/logo-dark.svg',
  '/manifest.json',
  '/offline.html'
];

// Patterns for resources to cache
const CACHE_PATTERNS = {
  // Cache-first strategy (static assets)
  cacheFirst: [
    /\.(?:css|js|woff2?|ttf|otf|eot)$/,
    /\/_next\/static\//,
    /\/fonts\//,
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/
  ],
  // Network-first strategy (API calls, dynamic content)
  networkFirst: [
    /\/api\//,
    /\/_next\/data\//,
    /\.json$/
  ],
  // Stale-while-revalidate strategy
  staleWhileRevalidate: [
    /\/dashboard/,
    /\/profile/,
    /\/transactions/
  ],
  // Never cache
  neverCache: [
    /\/api\/auth/,
    /\/api\/admin/,
    /\/api\/flutterwave/,
    /\/api\/inlomax\/.*\/(airtime|data|cable|electricity|betting)/,
    /socket\.io/,
    /hot-update/
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

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
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

// Periodic cache cleanup (every 24 hours when SW is active)
setInterval(() => {
  cleanDynamicCache();
}, 24 * 60 * 60 * 1000);

console.log('[SW] Service Worker loaded');
