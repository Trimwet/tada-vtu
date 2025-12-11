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
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { createClient } from "@/lib/supabase/client";

type Step = "current" | "new" | "confirm";

// Simple hash function for PIN (use bcrypt in production)
const hashPin = (pin: string): string => {
  return btoa(pin + "tada_salt_2024");
};

export default function ChangePinPage() {
  const { user, refreshUser } = useSupabaseUser();
  const [step, setStep] = useState<Step>("current");
  const [currentPin, setCurrentPin] = useState(["", "", "", ""]);
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(true);
  const [pinError, setPinError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    const { pin } = getCurrentPinArray();
    setPinError(null);

    if (pin.some((d) => !d)) {
      triggerError("Please enter all 4 digits");
      return;
    }

    if (step === "current") {
      // Verify current PIN against database
      const enteredHash = hashPin(pin.join(""));
      if (enteredHash !== user?.pin) {
        triggerError("Incorrect PIN. Please try again.");
        setCurrentPin(["", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        return;
      }
      setStep("new");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else if (step === "new") {
      // Check for weak PINs
      const pinStr = pin.join("");
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
        ].includes(pinStr)
      ) {
        triggerError("Please choose a stronger PIN");
        return;
      }
      setStep("confirm");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else if (step === "confirm") {
      if (newPin.join("") !== confirmPin.join("")) {
        triggerError("PINs do not match");
        setConfirmPin(["", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        return;
      }

      // Save new PIN via API
      setIsProcessing(true);
      try {
        const response = await fetch("/api/auth/reset-pin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user?.id,
            currentPin: currentPin.join(""),
            newPin: newPin.join(""),
          }),
        });

        const data = await response.json();

        if (data.success) {
          await refreshUser();
          toast.success("Transaction PIN updated successfully!");

          // Reset
          setCurrentPin(["", "", "", ""]);
          setNewPin(["", "", "", ""]);
          setConfirmPin(["", "", "", ""]);
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
      return "Set up a 4-digit PIN to secure your transactions";
    switch (step) {
      case "current":
        return "Enter your current 4-digit PIN";
      case "new":
        return "Choose a new 4-digit PIN";
      case "confirm":
        return "Re-enter your new PIN to confirm";
    }
  };

  // Check if user has existing PIN
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

          <CardContent className="pt-6">
            {/* PIN Input */}
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
            
            {/* Error Message */}
            {pinError && (
              <div className="flex items-center justify-center gap-2 mb-4 text-red-500 text-sm">
                <IonIcon name="alert-circle" size="16px" />
                <span>{pinError}</span>
              </div>
            )}
            
            <div className="mb-4"></div>

            {/* Action Button */}
            <Button
              onClick={handleNext}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-12 transition-smooth"
              disabled={pin.some((d) => !d) || isProcessing}
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
            {step !== "current" && step !== "new" && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (step === "confirm") {
                    setStep("new");
                    setConfirmPin(["", "", "", ""]);
                  } else if (step === "new" && hasExistingPin) {
                    setStep("current");
                    setNewPin(["", "", "", ""]);
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
                  Avoid using obvious numbers like 1234 or your birth year
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
              <li className="flex items-start gap-2">
                <IonIcon
                  name="checkmark"
                  size="16px"
                  color="#22c55e"
                  className="mt-0.5 shrink-0"
                />
                <span>
                  Contact support immediately if you suspect unauthorized access
                </span>
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
