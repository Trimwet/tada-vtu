'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IonIcon } from '@/components/ion-icon';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';

interface CreatePinModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hashedPin?: string) => void;
  canSkip?: boolean;
}

export function CreatePinModal({ userId, isOpen, onClose, onSuccess, canSkip = true }: CreatePinModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreatePin = async () => {
    if (pin.length !== 4) {
      toast.error('PIN must be 4 digits');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      toast.error('PIN must contain only numbers');
      return;
    }

    if (pin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      
      // Hash the PIN before storing (simple hash for demo - use bcrypt in production)
      const hashedPin = btoa(pin + 'tada_salt_2024'); // Base64 encode with salt
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any)
        .update({ pin: hashedPin })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Transaction PIN created successfully!');
      onSuccess(hashedPin);
      onClose();
    } catch (error) {
      console.error('Error creating PIN:', error);
      toast.error('Failed to create PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('pinSkipped', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <IonIcon name="lock-closed" size="32px" color="#22c55e" />
          </div>
          <CardTitle className="text-xl">Create Transaction PIN</CardTitle>
          <CardDescription>
            Set a 4-digit PIN to secure your transactions
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">Enter 4-digit PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirm PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <Button
            onClick={handleCreatePin}
            disabled={isLoading || pin.length !== 4 || confirmPin.length !== 4}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              'Create PIN'
            )}
          </Button>

          {canSkip && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="w-full text-muted-foreground"
            >
              Skip for now
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            You'll need this PIN to authorize transactions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
