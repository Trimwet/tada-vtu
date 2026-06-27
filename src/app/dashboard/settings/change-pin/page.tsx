"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { parse as parseEmojis } from 'twemoji-parser';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Step = "current" | "new" | "confirm";

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

export default function ChangePinPage() {
  const { user, refreshUser } = useSupabaseUser();
  const [step, setStep] = useState<Step>("current");
  
  // Numeric PIN states
  const [currentPin, setCurrentPin] = useState(["", "", "", ""]);
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  
  // Emoji PIN states
  const [currentEmojiPin, setCurrentEmojiPin] = useState("");
  const [newEmojiPin, setNewEmojiPin] = useState("");
  const [confirmEmojiPin, setConfirmEmojiPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Type states
  const [currentPinType, setCurrentPinType] = useState<'numeric' | 'emoji'>('numeric');
  const [newPinType, setNewPinType] = useState<'numeric' | 'emoji'>('numeric');

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(true);
  const [pinError, setPinError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-detect existing PIN type
  useEffect(() => {
    if (user?.pin) {
      try {
        const decoded = atob(user.pin);
        if (decoded.endsWith('tada_salt_2024')) {
          const rawPin = decoded.slice(0, -'tada_salt_2024'.length);
          const isNumeric = /^\d+$/.test(rawPin);
          setCurrentPinType(isNumeric ? 'numeric' : 'emoji');
        }
      } catch (e) {
        setCurrentPinType('numeric');
      }
    }
  }, [user]);

  const activePinType = step === 'current' ? currentPinType : newPinType;

  const getActiveEmojiState = () => {
    switch (step) {
      case 'current':
        return { value: currentEmojiPin, setter: setCurrentEmojiPin, show: showCurrentPin, setShow: setShowCurrentPin };
      case 'new':
        return { value: newEmojiPin, setter: setNewEmojiPin, show: showNewPin, setShow: setShowNewPin };
      case 'confirm':
        return { value: confirmEmojiPin, setter: setConfirmEmojiPin, show: showConfirmPin, setShow: setShowConfirmPin };
    }
  };
  
  const activeEmoji = getActiveEmojiState();

  const handlePinInput = (
    index: number,
    value: string,
    pinArray: string[],
    setPinArray: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (!/^\d*$/.test(value)) return;

    const newPinArray = [...pinArray];
    newPinArray[index] = value.slice(-1);
    setPinArray(newPinArray);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    pinArray: string[],
    setPinArray: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (e.key === "Backspace" && !pinArray[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const getCurrentPinArray = () => {
    switch (step) {
      case "current":
        return { pin: currentPin, setPin: setCurrentPin };
      case "new":
        return { pin: newPin, setPin: setNewPin };
      case "confirm":
        return { pin: confirmPin, setPin: setConfirmPin };
    }
  };

  const triggerError = (message: string) => {
    setPinError(message);
    setShake(true);
    toast.error(message);
    setTimeout(() => {
      setShake(false);
      setPinError(null);
    }, 2000);
  };

  const handleNext = async () => {
    setPinError(null);
    const finalPinVal = activePinType === 'numeric' ? getCurrentPinArray().pin.join('') : activeEmoji.value;

    if (activePinType === 'numeric' ? getCurrentPinArray().pin.some((d) => !d) : getParsedEmojis(finalPinVal).length !== 4) {
      triggerError(activePinType === 'numeric' ? "Please enter all 4 digits" : "Please enter all 4 emojis");
      return;
    }

    if (step === "current") {
      const enteredHash = hashPin(finalPinVal);
      if (enteredHash !== user?.pin) {
        triggerError("Incorrect PIN. Please try again.");
        if (currentPinType === 'numeric') {
          setCurrentPin(["", "", "", ""]);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        } else {
          setCurrentEmojiPin("");
        }
        return;
      }
      setStep("new");
    } else if (step === "new") {
      if (newPinType === 'numeric') {
        if (
          [
            "0000",
            "1111",
            "2222",
            "3333",
            "4444",
            "5555",
            "6666",
            "7777",
            "8888",
            "9999",
            "1234",
            "4321",
          ].includes(finalPinVal)
        ) {
          triggerError("Please choose a stronger PIN");
          return;
        }
      }
      setStep("confirm");
    } else if (step === "confirm") {
      const firstPinVal = newPinType === 'numeric' ? newPin.join('') : newEmojiPin;
      if (firstPinVal !== finalPinVal) {
        triggerError("PINs do not match");
        if (newPinType === 'numeric') {
          setConfirmPin(["", "", "", ""]);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        } else {
          setConfirmEmojiPin("");
        }
        return;
      }

      setIsProcessing(true);
      try {
        const currentPinVal = currentPinType === 'numeric' ? currentPin.join('') : currentEmojiPin;
        const response = await fetch("/api/auth/reset-pin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user?.id,
            currentPin: currentPinVal,
            newPin: finalPinVal,
          }),
        });

        const data = await response.json();

        if (data.success) {
          await refreshUser();
          toast.success("Transaction PIN updated successfully!");

          setCurrentPin(["", "", "", ""]);
          setNewPin(["", "", "", ""]);
          setConfirmPin(["", "", "", ""]);
          setCurrentEmojiPin("");
          setNewEmojiPin("");
          setConfirmEmojiPin("");
          
          setStep(hasExistingPin ? "current" : "new");
          setHasExistingPin(true);
        } else {
          toast.error(data.message || "Failed to update PIN");
        }
      } catch (error) {
        console.error("PIN update error:", error);
        toast.error("Failed to update PIN. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleEmojiClick = (emoji: string) => {
    const { value, setter } = activeEmoji;
    const current = getParsedEmojis(value);
    if (current.length < 4) {
      setter([...current, emoji].join(''));
    }
  };

  const handleEmojiBackspaceClick = () => {
    const { value, setter } = activeEmoji;
    setter(handleEmojiBackspace(value));
  };

  const handleEmojiClear = () => {
    const { setter } = activeEmoji;
    setter('');
  };

  const getParsedEmojis = (val: string) => {
    try {
      return parseEmojis(val).map(e => e.text);
    } catch (e) {
      return [];
    }
  };

  const parsedEmojis = getParsedEmojis(activeEmoji.value);

  const { pin, setPin } = getCurrentPinArray();

  const getStepTitle = () => {
    if (!hasExistingPin && step === "current") return "Create Transaction PIN";
    switch (step) {
      case "current":
        return "Enter Current PIN";
      case "new":
        return "Enter New PIN";
      case "confirm":
        return "Confirm New PIN";
    }
  };

  const getStepDescription = () => {
    if (!hasExistingPin && step === "current")
      return "Set up a PIN to secure your transactions";
    switch (step) {
      case "current":
        return activePinType === 'numeric' ? "Enter your current 4-digit PIN" : "Enter your current 4-emoji PIN";
      case "new":
        return newPinType === 'numeric' ? "Choose a new 4-digit PIN" : "Choose a new 4-emoji PIN";
      case "confirm":
        return newPinType === 'numeric' ? "Re-enter your new PIN to confirm" : "Re-enter your new emoji PIN to confirm";
    }
  };

  const isStepFilled = () => {
    if (activePinType === 'numeric') {
      return !pin.some((d) => !d);
    } else {
      return parsedEmojis.length === 4;
    }
  };

  useEffect(() => {
    if (user) {
      const hasPIN = !!user.pin;
      setHasExistingPin(hasPIN);
      if (!hasPIN) {
        setStep("new");
      }
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard/settings"
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-smooth"
            >
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2">
              Transaction PIN
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-md">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(hasExistingPin
            ? ["current", "new", "confirm"]
            : ["new", "confirm"]
          ).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-smooth ${
                  step === s
                    ? "bg-green-500 text-white"
                    : (hasExistingPin
                          ? ["current", "new", "confirm"]
                          : ["new", "confirm"]
                        ).indexOf(step) > i
                      ? "bg-green-500/20 text-green-500"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {(hasExistingPin
                  ? ["current", "new", "confirm"]
                  : ["new", "confirm"]
                ).indexOf(step) > i ? (
                  <IonIcon name="checkmark" size="16px" />
                ) : (
                  i + 1
                )}
              </div>
              {i < (hasExistingPin ? 2 : 1) && (
                <div
                  className={`w-12 h-1 mx-1 rounded transition-smooth ${
                    (hasExistingPin
                      ? ["current", "new", "confirm"]
                      : ["new", "confirm"]
                    ).indexOf(step) > i
                      ? "bg-green-500"
                      : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IonIcon name="keypad" size="32px" color="#22c55e" />
            </div>
            <CardTitle className="text-xl">{getStepTitle()}</CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* New PIN type selector on Enter New PIN step */}
            {step === 'new' && (
              <Tabs value={newPinType} onValueChange={(v) => {
                setNewPinType(v as 'numeric' | 'emoji');
                setNewPin(["", "", "", ""]);
                setNewEmojiPin("");
                setConfirmPin(["", "", "", ""]);
                setConfirmEmojiPin("");
              }} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-2">
                  <TabsTrigger value="numeric" className="flex items-center gap-2">
                    <IonIcon name="keypad-outline" size="14px" />
                    Numeric PIN
                  </TabsTrigger>
                  <TabsTrigger value="emoji" className="flex items-center gap-2">
                    <IonIcon name="happy-outline" size="14px" />
                    Emoji PIN
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* PIN Input */}
            {activePinType === 'numeric' ? (
              <div className={`flex justify-center gap-3 mb-4 ${shake ? 'animate-shake' : ''}`}>
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={`${step}-${index}`}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={pin[index]}
                    onChange={(e) =>
                      handlePinInput(index, e.target.value, pin, setPin)
                    }
                    onKeyDown={(e) => handleKeyDown(index, e, pin, setPin)}
                    className={`w-14 h-14 text-center text-2xl font-bold bg-background border-2 rounded-xl focus:outline-none transition-smooth ${
                      pinError 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-border focus:border-green-500'
                    }`}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4 mb-4">
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
                          {char ? (activeEmoji.show ? char : '🔒') : '•'}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => activeEmoji.setShow(p => !p)}
                    className="absolute right-3 top-2.5 p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-smooth"
                  >
                    <IonIcon name={activeEmoji.show ? "eye-off-outline" : "eye-outline"} size="18px" />
                  </button>
                </div>

                {/* Helper text input for typing/pasting */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground px-1">Or type/paste emojis:</span>
                  <Input
                    type="text"
                    placeholder="Type/paste emojis here..."
                    value={activeEmoji.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      const emojis = getParsedEmojis(val);
                      activeEmoji.setter(emojis.slice(0, 4).join(''));
                    }}
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
              </div>
            )}
            
            {/* Error Message */}
            {pinError && (
              <div className="flex items-center justify-center gap-2 mb-4 text-red-500 text-sm">
                <IonIcon name="alert-circle" size="16px" />
                <span>{pinError}</span>
              </div>
            )}
            
            {/* Action Button */}
            <Button
              onClick={handleNext}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-12 transition-smooth"
              disabled={!isStepFilled() || isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </div>
              ) : step === "confirm" ? (
                <div className="flex items-center gap-2">
                  <IonIcon name="checkmark-circle-outline" size="20px" />
                  Confirm PIN
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <IonIcon name="arrow-forward-outline" size="20px" />
                  Continue
                </div>
              )}
            </Button>

            {/* Back Button */}
            {step !== "current" && (step !== "new" || hasExistingPin) && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (step === "confirm") {
                    setStep("new");
                    setConfirmPin(["", "", "", ""]);
                    setConfirmEmojiPin("");
                  } else if (step === "new" && hasExistingPin) {
                    setStep("current");
                    setNewPin(["", "", "", ""]);
                    setNewEmojiPin("");
                  }
                }}
                className="w-full mt-2 text-muted-foreground"
              >
                Go Back
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card className="border-border mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IonIcon
                name="shield-checkmark-outline"
                size="18px"
                color="#22c55e"
              />
              Security Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <IonIcon
                  name="checkmark"
                  size="16px"
                  color="#22c55e"
                  className="mt-0.5 shrink-0"
                />
                <span>Never share your PIN with anyone</span>
              </li>
              <li className="flex items-start gap-2">
                <IonIcon
                  name="checkmark"
                  size="16px"
                  color="#22c55e"
                  className="mt-0.5 shrink-0"
                />
                <span>
                  For emoji PINs, choose symbols that have personal meaning but are hard for others to guess
                </span>
              </li>
              <li className="flex items-start gap-2">
                <IonIcon
                  name="checkmark"
                  size="16px"
                  color="#22c55e"
                  className="mt-0.5 shrink-0"
                />
                <span>Change your PIN regularly for better security</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Forgot PIN */}
        <div className="text-center mt-6">
          <Link
            href="/dashboard/settings/reset-pin"
            className="text-sm text-green-500 hover:text-green-400 font-medium transition-smooth"
          >
            Forgot your PIN?
          </Link>
        </div>
      </main>
    </div>
  );
}
