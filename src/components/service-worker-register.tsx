'use client';

import { useEffect } from 'react';
import { toast } from '@/lib/toast';

// Reload guard to prevent infinite loops
let lastReloadTime = 0;
const RELOAD_COOLDOWN = 10000; // 10 seconds

function canSafelyReload(): boolean {
  const now = Date.now();
  if (now - lastReloadTime < RELOAD_COOLDOWN) {
    console.log('[App] Reload prevented - too soon after last reload');
    return false;
  }
  lastReloadTime = now;
  return true;
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker after page load
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[App] Service Worker registered:', registration.scope);

            // Handle updates with user notification (not automatic reload)
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New version available - show notification
                    console.log('[App] New Service Worker version available');

                    toast.info('Update Available', 'A new version is ready. Refresh to update.');

                    // Auto-skip waiting after showing notification
                    setTimeout(() => {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }, 1000);
                  }
                });
              }
            });

            // Check for updates periodically (every hour)
            setInterval(() => {
              registration.update().catch((error) => {
                console.log('[App] Update check failed:', error);
              });
            }, 60 * 60 * 1000);
          })
          .catch((error) => {
            console.log('[App] Service Worker registration failed:', error);
          });
      });

      // FIXED: Only reload on controller change if user explicitly clicked update
      // Removed automatic reload to prevent infinite loops on mobile
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] New Service Worker controller detected');

        // Only reload if we recently initiated an update AND it's safe
        if (canSafelyReload()) {
          console.log('[App] Reloading for new version...');
          window.location.reload();
        } else {
          console.log('[App] Controller changed but reload skipped (preventing loop)');
        }
      });
    }
  }, []);

  return null;
}
