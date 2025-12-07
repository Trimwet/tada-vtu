'use client';

import { useState, useEffect, useRef } from 'react';
import { IonIcon } from '@/components/ion-icon';

export function NetworkStatusBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(false);
  const [showRecovered, setShowRecovered] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
      
      // Show "recovered" message if was offline
      if (wasOfflineRef.current) {
        setShowRecovered(true);
        setTimeout(() => setShowRecovered(false), 2500);
      }
      wasOfflineRef.current = false;
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
      wasOfflineRef.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show "Connection restored" briefly
  if (showRecovered) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-center text-sm font-medium bg-green-500 text-white">
        <div className="flex items-center justify-center gap-2">
          <IonIcon name="checkmark-circle" size="16px" />
          <span>Connection restored!</span>
        </div>
      </div>
    );
  }

  // Show offline warning
  if (showOffline && !isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-center text-sm font-medium bg-red-500 text-white">
        <div className="flex items-center justify-center gap-2">
          <IonIcon name="cloud-offline-outline" size="16px" />
          <span>You&apos;re offline. Some features may not work.</span>
        </div>
      </div>
    );
  }

  return null;
}
