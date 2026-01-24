'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { IonIcon } from '@/components/ion-icon';
import { toast } from 'sonner';
import Link from 'next/link';

interface VerifyPinModalProps {
  userPin: string | null;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (pin: string) => void; // Pass the verified PIN
  title?: string;
  description?: string;
}

export function VerifyPinModal({ 
  userPin, 
  isOpen, 
  onClose, 
  onVerified,
  title = 'Enter Transaction PIN',
  description = 'Enter your 4-digit PIN to continue'
}: VerifyPinModalProps) {
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  if (!isOpen) return null;

  // If user doesn't have a PIN, show create PIN prompt
  if (!userPin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IonIcon name="warning" size="32px" color="#eab308" />
            </div>
            <CardTitle className="text-xl">PIN Required</CardTitle>
            <CardDescription>
              You need to create a transaction PIN before making purchases
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Link href="/dashboard/settings/change-pin">
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                <IonIcon name="lock-closed-outline" size="18px" className="mr-2" />
                Create PIN Now
              </Button>
            </Link>
            <Button variant="ghost" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleVerify = () => {
    if (pin.length !== 4) {
      toast.error('Please enter your 4-digit PIN');
      return;
    }

    // Verify PIN (compare with hashed version using same salt)
    const hashedInput = btoa(pin + 'tada_salt_2024');
    
    if (hashedInput === userPin) {
      const verifiedPin = pin; // Store the actual PIN before clearing
      setPin('');
      setAttempts(0);
      onVerified(verifiedPin); // Pass the actual PIN to the callback
      onClose();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      
      if (newAttempts >= maxAttempts) {
        toast.error('Too many failed attempts. Please try again later.');
        onClose();
      } else {
        toast.error(`Incorrect PIN. ${maxAttempts - newAttempts} attempts remaining.`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <IonIcon name="keypad" size="32px" color="#22c55e" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className="text-center text-2xl tracking-widest"
            autoFocus
          />

          <Button
            onClick={handleVerify}
            disabled={pin.length !== 4}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            Verify PIN
          </Button>

          <Button variant="ghost" onClick={onClose} className="w-full">
            Cancel
          </Button>

          <div className="text-center">
            <Link 
              href="/dashboard/settings/reset-pin" 
              className="text-sm text-green-500 hover:text-green-400"
            >
              Forgot PIN?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
