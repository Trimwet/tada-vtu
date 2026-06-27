'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { IonIcon } from '@/components/ion-icon';
import { toast } from 'sonner';
import Link from 'next/link';
import { parse as parseEmojis } from 'twemoji-parser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VerifyPinModalProps {
  userPin: string | null;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (pin: string) => void; // Pass the verified PIN
  title?: string;
  description?: string;
}

const CURATED_EMOJIS = ['🦁', '🚀', '💎', '🔑', '💰', '⚡', '🛡️', '👑', '🔥', '🌟', '🍀', '🍕', '🦄', '🦅', '🔒', '🎯'];

// UTF-8 safe base64 encoding matching Node.js Buffer
const hashPin = (pin: string): string => {
  const salted = pin + 'tada_salt_2024';
  return btoa(encodeURIComponent(salted).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
};

const handleEmojiBackspace = (currentVal: string) => {
  try {
    const parsed = parseEmojis(currentVal);
    if (parsed.length === 0) return '';
    const remaining = parsed.slice(0, -1);
    return remaining.map(e => e.text).join('');
  } catch (e) {
    return '';
  }
};

export function VerifyPinModal({ 
  userPin, 
  isOpen, 
  onClose, 
  onVerified,
  title = 'Enter Transaction PIN',
  description = 'Enter your 4-digit or 4-emoji PIN to continue'
}: VerifyPinModalProps) {
  const [pinType, setPinType] = useState<'numeric' | 'emoji'>('numeric');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  // Auto-detect the PIN type from userPin hash
  useEffect(() => {
    if (userPin) {
      try {
        const decoded = atob(userPin);
        if (decoded.endsWith('tada_salt_2024')) {
          const rawPin = decoded.slice(0, -'tada_salt_2024'.length);
          // Check if it's purely digits
          const isNumeric = /^\d+$/.test(rawPin);
          setPinType(isNumeric ? 'numeric' : 'emoji');
        }
      } catch (e) {
        // Fallback to numeric
        setPinType('numeric');
      }
    }
  }, [userPin]);

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
    const parsedLen = pinType === 'numeric' ? pin.length : getParsedEmojis(pin).length;
    if (parsedLen !== 4) {
      toast.error(pinType === 'numeric' ? 'Please enter your 4-digit PIN' : 'Please enter your 4-emoji PIN');
      return;
    }

    const hashedInput = hashPin(pin);
    
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

  const handleTabChange = (v: string) => {
    setPinType(v as 'numeric' | 'emoji');
    setPin('');
  };

  const handleEmojiClick = (emoji: string) => {
    const current = getParsedEmojis(pin);
    if (current.length < 4) {
      setPin([...current, emoji].join(''));
    }
  };

  const handleEmojiBackspaceClick = () => {
    setPin(handleEmojiBackspace(pin));
  };

  const handleEmojiClear = () => {
    setPin('');
  };

  const getParsedEmojis = (val: string) => {
    try {
      return parseEmojis(val).map(e => e.text);
    } catch (e) {
      return [];
    }
  };

  const parsedEmojis = getParsedEmojis(pin);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <IonIcon name="keypad" size="32px" color="#22c55e" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs value={pinType} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="numeric" className="flex items-center gap-2">
                <IonIcon name="keypad-outline" size="16px" />
                Numeric PIN
              </TabsTrigger>
              <TabsTrigger value="emoji" className="flex items-center gap-2">
                <IonIcon name="happy-outline" size="16px" />
                Emoji PIN
              </TabsTrigger>
            </TabsList>

            <TabsContent value="numeric" className="space-y-4">
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="text-center text-2xl tracking-widest h-12 bg-background/50 border-border focus:border-green-500 pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-smooth"
                >
                  <IonIcon name={showPin ? "eye-off-outline" : "eye-outline"} size="18px" />
                </button>
              </div>
            </TabsContent>

            <TabsContent value="emoji" className="space-y-4">
              {/* Display slots */}
              <div className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3 mt-1">
                  {[0, 1, 2, 3].map((idx) => {
                    const char = parsedEmojis[idx];
                    return (
                      <div
                        key={idx}
                        className={`w-12 h-12 flex items-center justify-center border-2 rounded-xl text-xl font-bold bg-background transition-all duration-150 ${
                          char
                            ? 'border-green-500 scale-105 shadow-md shadow-green-500/10'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {char ? (showPin ? char : '🔒') : '•'}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPin(p => !p)}
                  className="absolute right-3 top-2.5 p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-smooth"
                >
                  <IonIcon name={showPin ? "eye-off-outline" : "eye-outline"} size="18px" />
                </button>
              </div>

              {/* Helper text input for typing/pasting */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground px-1">Or type/paste emojis:</span>
                <Input
                  type="text"
                  placeholder="Type/paste emojis here..."
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value;
                    const emojis = getParsedEmojis(val);
                    setPin(emojis.slice(0, 4).join(''));
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="text-center text-base bg-background/50 h-10 border-border focus:border-green-500"
                />
              </div>

              {/* Emoji Keypad */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block text-center">Quick Emoji Keypad:</span>
                <div className="grid grid-cols-4 gap-1.5 max-w-[240px] mx-auto">
                  {CURATED_EMOJIS.map((emoji) => (
                    <Button
                      key={emoji}
                      type="button"
                      variant="outline"
                      className="w-10 h-10 text-xl flex items-center justify-center p-0 hover:bg-green-500/10 hover:border-green-500/30 hover:scale-105 active:scale-95 transition-all duration-150"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="col-span-2 h-10 text-xs font-medium flex items-center justify-center gap-1 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all duration-150"
                    onClick={handleEmojiClear}
                  >
                    <IonIcon name="trash-outline" size="14px" />
                    Clear
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="col-span-2 h-10 text-xs font-medium flex items-center justify-center gap-1 hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-500 transition-all duration-150"
                    onClick={handleEmojiBackspaceClick}
                  >
                    <IonIcon name="backspace-outline" size="14px" />
                    Del
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleVerify}
            disabled={
              pinType === 'numeric'
                ? pin.length !== 4
                : parsedEmojis.length !== 4
            }
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-11 transition-smooth mt-2"
          >
            Verify PIN
          </Button>

          <Button variant="ghost" onClick={onClose} className="w-full h-9">
            Cancel
          </Button>

          <div className="text-center">
            <Link 
              href="/dashboard/settings/reset-pin" 
              className="text-sm text-green-500 hover:text-green-400 font-medium"
            >
              Forgot PIN?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
