"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IonIcon } from '@/components/ion-icon';
import { toast } from '@/lib/toast';

export function CheckDepositsButton() {
  const [checking, setChecking] = useState(false);

  const handleCheckDeposits = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/manual-check-transfers', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        if (result.processed > 0) {
          toast.success('Deposits Found!', { 
            description: `${result.processed} new transfer(s) have been credited to your wallet.`,
            confetti: true
          });
          // Refresh the page to show updated balance
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.info('All Up to Date', 'No new deposits found. All transfers have been processed.');
        }
      } else {
        toast.error('Check Failed', result.message || 'Unable to check for deposits right now.');
      }
    } catch (error) {
      console.error('Check deposits error:', error);
      toast.error('Check Failed', 'Network error. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Button
      onClick={handleCheckDeposits}
      disabled={checking}
      variant="outline"
      className="w-full border-green-500/30 text-green-600 hover:bg-green-500/10"
    >
      {checking ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          Checking...
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <IonIcon name="refresh" size="18px" />
          Check for Deposits
        </div>
      )}
    </Button>
  );
}