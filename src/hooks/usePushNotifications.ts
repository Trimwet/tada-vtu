"use client";

import { useState, useEffect, useCallback } from 'react';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'default';
  loading: boolean;
  error: string | null;
}

export function usePushNotifications(userId: string | undefined) {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    loading: true,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      // 1. Basic API check
      const hasWorker = 'serviceWorker' in navigator;
      const hasPush = 'PushManager' in window;
      const hasNotify = 'Notification' in window;

      // 2. Check for insecure context (HTTP)
      if (!window.isSecureContext) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          loading: false,
          error: 'Push notifications require a secure (HTTPS) connection'
        }));
        return;
      }

      if (!hasWorker || !hasPush || !hasNotify) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          loading: false,
          error: 'Browser does not support push notifications'
        }));
        return;
      }

      try {
        // 3. Try a tiny PushManager check to catch Private Mode (where property exists but fails)
        const registration = await navigator.serviceWorker.ready;
        if (!registration.pushManager) {
          throw new Error('PushManager not available (Private Mode?)');
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          loading: false,
          error: 'Unsupported or Private Browsing mode'
        }));
        return;
      }

      const permission = Notification.permission;

      // Check if already subscribed
      let isSubscribed = false;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
      } catch {
        // Ignore errors
      }

      setState(prev => ({
        ...prev,
        isSupported: true,
        isSubscribed,
        permission,
        loading: false,
      }));
    };

    checkSupport();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!userId || !state.isSupported) return false;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          permission,
          loading: false,
          error: 'Notification permission denied',
        }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON(),
        }),
      });

      const result = await response.json();

      if (!result.status) {
        throw new Error(result.message || 'Failed to save subscription');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        loading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return false;
    }
  }, [userId, state.isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!userId) return false;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            endpoint: subscription.endpoint,
          }),
        });
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        loading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unsubscribe';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return false;
    }
  }, [userId]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}


