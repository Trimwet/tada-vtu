'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IonIcon } from '@/components/ion-icon';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { ButtonLoading } from '@/components/loading-icons';
import { parse as parseEmojis } from 'twemoji-parser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pinSchema, validateFormData } from '@/lib/validation';

interface CreatePinModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hashedPin?: string) => void;
  canSkip?: boolean;
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

export function CreatePinModal({ userId, isOpen, onClose, onSuccess, canSkip = true }: CreatePinModalProps) {
  const [pinType, setPinType] = useState<'numeric' | 'emoji'>('numeric');
  
  // Numeric states
  const [numericPin, setNumericPin] = useState('');
  const [numericConfirm, setNumericConfirm] = useState('');
  
  // Emoji states
  const [emojiPin, setEmojiPin] = useState('');
  const [emojiConfirm, setEmojiConfirm] = useState('');
  const [activeField, setActiveField] = useState<'pin' | 'confirm'>('pin');
  const [showEmojiPin, setShowEmojiPin] = useState(false);
  const [showEmojiConfirm, setShowEmojiConfirm] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  // Auto-advance to confirm field when entering 4th emoji
  useEffect(() => {
    try {
      const count = parseEmojis(emojiPin).length;
      if (count === 4 && activeField === 'pin') {
        const timer = setTimeout(() => {
          setActiveField('confirm');
        }, 300);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, [emojiPin, activeField]);

  if (!isOpen) return null;

  const handleCreatePin = async () => {
    const finalPin = pinType === 'numeric' ? numericPin : emojiPin;
    const finalConfirm = pinType === 'numeric' ? numericConfirm : emojiConfirm;

    const validation = validateFormData(pinSchema, finalPin);
    if (!validation.success) {
      toast.error(validation.errors?.[0] || 'Invalid PIN format');
      return;
    }

    if (finalPin !== finalConfirm) {
      toast.error('PINs do not match');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const hashedPin = hashPin(finalPin);
      
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

  const handleEmojiClick = (emoji: string) => {
    if (activeField === 'pin') {
      const current = getParsedEmojis(emojiPin);
      if (current.length < 4) {
        setEmojiPin([...current, emoji].join(''));
      }
    } else {
      const current = getParsedEmojis(emojiConfirm);
      if (current.length < 4) {
        setEmojiConfirm([...current, emoji].join(''));
      }
    }
  };

  const handleEmojiBackspaceClick = () => {
    if (activeField === 'pin') {
      setEmojiPin(handleEmojiBackspace(emojiPin));
    } else {
      setEmojiConfirm(handleEmojiBackspace(emojiConfirm));
    }
  };

  const handleEmojiClear = () => {
    if (activeField === 'pin') {
      setEmojiPin('');
    } else {
      setEmojiConfirm('');
    }
  };

  const getParsedEmojis = (val: string) => {
    try {
      return parseEmojis(val).map(e => e.text);
    } catch (e) {
      return [];
    }
  };

  const parsedPin = getParsedEmojis(emojiPin);
  const parsedConfirm = getParsedEmojis(emojiConfirm);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <IonIcon name="lock-closed" size="32px" color="#22c55e" />
          </div>
          <CardTitle className="text-xl">Create Transaction PIN</CardTitle>
          <CardDescription>
            Secure your wallet transactions with a 4-digit or 4-emoji PIN
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs value={pinType} onValueChange={(v) => setPinType(v as 'numeric' | 'emoji')} className="w-full">
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
              <div className="space-y-2">
                <Label htmlFor="pin">Enter 4-digit PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={numericPin}
                  onChange={(e) => setNumericPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest h-12 bg-background/50 border-border focus:border-green-500"
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
                  value={numericConfirm}
                  onChange={(e) => setNumericConfirm(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest h-12 bg-background/50 border-border focus:border-green-500"
                />
              </div>
            </TabsContent>

            <TabsContent value="emoji" className="space-y-4">
              {/* Field Toggle */}
              <div className="flex bg-muted p-1 rounded-lg max-w-[240px] mx-auto">
                <button
                  type="button"
                  onClick={() => setActiveField('pin')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeField === 'pin'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  1. Enter PIN
                </button>
                <button
                  type="button"
                  onClick={() => setActiveField('confirm')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeField === 'confirm'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  2. Confirm PIN
                </button>
              </div>

              {/* Display visual slots for currently active state */}
              <div className="space-y-3">
                <div className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {activeField === 'pin' ? 'New Emoji PIN' : 'Confirm Emoji PIN'}
                  </span>
                  
                  <div className="flex items-center gap-3 mt-1">
                    {[0, 1, 2, 3].map((idx) => {
                      const list = activeField === 'pin' ? parsedPin : parsedConfirm;
                      const show = activeField === 'pin' ? showEmojiPin : showEmojiConfirm;
                      const char = list[idx];
                      
                      return (
                        <div
                          key={idx}
                          className={`w-12 h-12 flex items-center justify-center border-2 rounded-xl text-xl font-bold bg-background transition-all duration-150 ${
                            char
                              ? 'border-green-500 scale-105 shadow-md shadow-green-500/10'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          {char ? (show ? char : '🔒') : '•'}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeField === 'pin') setShowEmojiPin(p => !p);
                      else setShowEmojiConfirm(p => !p);
                    }}
                    className="absolute right-3 top-2.5 p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-smooth"
                    title={activeField === 'pin' ? (showEmojiPin ? 'Hide PIN' : 'Show PIN') : (showEmojiConfirm ? 'Hide PIN' : 'Show PIN')}
                  >
                    <IonIcon
                      name={
                        activeField === 'pin'
                          ? (showEmojiPin ? 'eye-off-outline' : 'eye-outline')
                          : (showEmojiConfirm ? 'eye-off-outline' : 'eye-outline')
                      }
                      size="18px"
                    />
                  </button>
                </div>

                {/* Helper text input for keyboard/pasting */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground px-1">Or type/paste emojis:</span>
                  <Input
                    type="text"
                    placeholder="Type/paste emojis here..."
                    value={activeField === 'pin' ? emojiPin : emojiConfirm}
                    onChange={(e) => {
                      const val = e.target.value;
                      const emojis = getParsedEmojis(val);
                      if (activeField === 'pin') {
                        setEmojiPin(emojis.slice(0, 4).join(''));
                      } else {
                        setEmojiConfirm(emojis.slice(0, 4).join(''));
                      }
                    }}
                    className="text-center text-base bg-background/50 h-10 border-border focus:border-green-500"
                  />
                </div>
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
            onClick={handleCreatePin}
            disabled={
              isLoading ||
              (pinType === 'numeric'
                ? numericPin.length !== 4 || numericConfirm.length !== 4
                : parsedPin.length !== 4 || parsedConfirm.length !== 4)
            }
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-11 transition-smooth mt-2"
          >
            {isLoading ? (
              <ButtonLoading type="sending" text="Creating..." />
            ) : (
              'Create PIN'
            )}
          </Button>

          {canSkip && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="w-full text-muted-foreground h-9"
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
