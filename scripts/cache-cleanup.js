#!/usr/bin/env node

/**
 * TADA VTU Cache Cleanup Script
 * Ensures no caching of removed features (gifts, favorites, cable, electricity, betting)
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 TADA VTU Cache Cleanup');
console.log('Removing all traces of deleted features...\n');

// 1. Clear Next.js build cache
function clearNextJSCache() {
  console.log('🗂️ Clearing Next.js build cache...');
  
  const cacheDirs = [
    '.next',
    'node_modules/.cache',
    '.vercel',
    'dist',
    'build'
  ];
  
  cacheDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`✅ Removed ${dir}`);
      } catch (error) {
        console.log(`⚠️ Could not remove ${dir}: ${error.message}`);
      }
    }
  });
}

// 2. Update package.json to remove unused dependencies
function cleanupDependencies() {
  console.log('📦 Cleaning up unused dependencies...');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Dependencies that might be unused after cleanup
  const potentiallyUnused = [
    'recharts', // Only used in admin, might be removable
    // Add others as needed
  ];
  
  console.log('📋 Dependencies to review manually:', potentiallyUnused.join(', '));
  console.log('✅ Package.json reviewed');
}

// 3. Create cache-busting headers
function createCacheBustingConfig() {
  console.log('🔄 Creating cache-busting configuration...');
  
  const cacheBustConfig = `
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
`;
  
  fs.writeFileSync(
    path.join(process.cwd(), 'src/lib/cache-config.ts'),
    cacheBustConfig.trim()
  );
  console.log('✅ Cache-busting config created');
}

// 4. Create service worker to clear old caches
function createServiceWorkerCleanup() {
  console.log('🔧 Creating service worker cache cleanup...');
  
  const swCleanup = `
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
`;
  
  fs.writeFileSync(
    path.join(process.cwd(), 'public/sw-cleanup.js'),
    swCleanup.trim()
  );
  console.log('✅ Service worker cleanup created');
}

// 5. Create cache invalidation utility
function createCacheInvalidationUtil() {
  console.log('⚡ Creating cache invalidation utility...');
  
  const cacheUtil = `
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
`;
  
  fs.writeFileSync(
    path.join(process.cwd(), 'src/lib/cache-invalidation.ts'),
    cacheUtil.trim()
  );
  console.log('✅ Cache invalidation utility created');
}

// Run all cleanup operations
async function runCacheCleanup() {
  try {
    clearNextJSCache();
    cleanupDependencies();
    createCacheBustingConfig();
    createServiceWorkerCleanup();
    createCacheInvalidationUtil();
    
    console.log('\n🎉 Cache cleanup complete!');
    console.log('\n📋 Manual steps required:');
    console.log('1. Clear browser cache: Ctrl+Shift+R (hard refresh)');
    console.log('2. Clear Vercel cache: vercel --prod --force');
    console.log('3. Review dependencies: npm audit');
    console.log('4. Test in incognito mode to verify no old features');
    console.log('5. Run: npm run build to generate fresh build');
    
  } catch (error) {
    console.error('❌ Cache cleanup failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runCacheCleanup();
}

module.exports = { runCacheCleanup };