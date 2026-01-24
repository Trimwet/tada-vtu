'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useTransactionPin() {
  const { profile, refreshProfile } = useAuth();
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [showVerifyPin, setShowVerifyPin] = useState(false);
  const [localPin, setLocalPin] = useState<string | null>(null);
  const pendingActionRef = useRef<((pin: string) => void) | null>(null);

  // Use local pin state if available (just created), otherwise use profile
  const userPin = localPin || profile?.pin || null;
  const hasPin = !!userPin;

  // Require PIN verification before an action
  const requirePin = useCallback((action: (pin: string) => void) => {
    if (!hasPin) {
      // User needs to create PIN first - store action for after creation
      pendingActionRef.current = action;
      setShowCreatePin(true);
      return;
    }
    
    // Show PIN verification modal
    pendingActionRef.current = action;
    setShowVerifyPin(true);
  }, [hasPin]);

  // Called when PIN is verified successfully
  const onPinVerified = useCallback((pin: string) => {
    setShowVerifyPin(false);
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action(pin); // Pass the verified PIN to the action
    }
  }, []);

  // Called when PIN is created successfully
  const onPinCreated = useCallback(async (newPin?: string) => {
    // Store the new PIN locally so we don't need to wait for profile refresh
    if (newPin) {
      setLocalPin(newPin);
    }
    setShowCreatePin(false);
    
    // Refresh profile in background
    refreshProfile();
    
    // If there was a pending action, now show verify modal
    if (pendingActionRef.current) {
      setTimeout(() => {
        setShowVerifyPin(true);
      }, 300);
    }
  }, [refreshProfile]);

  return {
    hasPin,
    userPin,
    showCreatePin,
    showVerifyPin,
    setShowCreatePin,
    setShowVerifyPin,
    requirePin,
    onPinVerified,
    onPinCreated,
  };
}
