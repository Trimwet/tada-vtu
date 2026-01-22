"use client";

import { useState, useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useAuth } from "@/hooks/useAuth";

// Optimized loading spinner component
const LoadingSpinner = ({ size = "sm", variant = "button" }: { 
  size?: "sm" | "md" | "lg";
  variant?: "button" | "page";
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };
  
  const colorClasses = {
    button: "border-white border-t-transparent",
    page: "border-muted border-t-primary"
  };
  
  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 ${colorClasses[variant]}`} />
  );
};

// Optimized email reminder component
const EmailReminderAlert = ({ email }: { email: string }) => (
  <div className="border border-blue-200 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
    <div className="flex items-start gap-2">
      <IonIcon name="mail-outline" size="16px" className="text-blue-600 mt-0.5" />
      <div className="text-sm">
        <div className="space-y-2">
          <p><strong>Check your email:</strong> {email}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>📧</span>
            <span>Check your <strong>inbox</strong> and <strong>spam/junk folder</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>⏰</span>
            <span>Code expires in 10 minutes</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

type Step = "request" | "verify" | "newpin";
type LoadingState = "idle" | "sending" | "verifying" | "saving";

export default function ResetPinPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [step, setStep] = useState<Step>("request");
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Memoized user email for performance
  const userEmail = useMemo(() => user?.email, [user?.email]);

  // Optimized API call function
  const makeApiCall = useCallback(async (payload: Record<string, any>) => {
    const response = await fetch("/api/auth/forgot-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }, []);

  const handleRequestReset = useCallback(async () => {
    if (!userEmail) {
      toast.error("User email not found. Please login again.");
      return;
    }

    setLoadingState("sending");
    
    try {
      const data = await makeApiCall({
        action: "request",
        email: userEmail,
      });

      if (data.success) {
        toast.success("Verification code sent!", {
          description: "Check your email and spam folder for the 6-digit code.",
          duration: 5000,
        });
        startTransition(() => {
          setStep("verify");
        });
      } else {
        toast.error(data.message || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Error requesting reset:", error);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoadingState("idle");
    }
  }, [userEmail, makeApiCall]);

  const handleVerifyOtp = useCallback(async () => {
    if (!userEmail) {
      toast.error("User email not found. Please login again.");
      return;
    }

    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setLoadingState("verifying");
    
    try {
      const data = await makeApiCall({
        action: "verify",
        email: userEmail,
        otp: otp,
      });

      if (data.success) {
        toast.success("Code verified successfully!");
        startTransition(() => {
          setStep("newpin");
        });
      } else {
        toast.error(data.message || "Invalid verification code");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingState("idle");
    }
  }, [userEmail, otp, makeApiCall]);

  const handleSetNewPin = useCallback(async () => {
    // Validation
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    if (!userEmail) {
      toast.error("User email not found. Please login again.");
      return;
    }

    setLoadingState("saving");
    
    try {
      const data = await makeApiCall({
        action: "reset",
        email: userEmail,
        otp: otp,
        newPin: newPin,
      });

      if (data.success) {
        toast.success("PIN reset successfully!", {
          description: "Redirecting to settings...",
          duration: 3000,
        });
        
        // Optimized navigation with transition
        setTimeout(() => {
          startTransition(() => {
            router.push("/dashboard/settings");
          });
        }, 1000);
      } else {
        toast.error(data.message || "Failed to reset PIN");
      }
    } catch (error) {
      console.error("Error resetting PIN:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingState("idle");
    }
  }, [userEmail, otp, newPin, confirmPin, makeApiCall, router]);

  // Optimized handlers
  const handleResendCode = useCallback(() => {
    setOtp("");
    startTransition(() => {
      setStep("request");
    });
  }, []);

  const handleOtpChange = useCallback((value: string) => {
    const numericValue = value.replace(/\D/g, "");
    setOtp(numericValue);
  }, []);

  const handlePinChange = useCallback((value: string, setter: (val: string) => void) => {
    const numericValue = value.replace(/\D/g, "");
    setter(numericValue);
  }, []);

  // Memoized validation states
  const isRequestLoading = loadingState === "sending";
  const isVerifyLoading = loadingState === "verifying";
  const isSaveLoading = loadingState === "saving";
  const isAnyLoading = loadingState !== "idle" || isPending;

  const canVerify = otp.length === 6 && !isAnyLoading;
  const canSave = newPin.length === 4 && confirmPin.length === 4 && !isAnyLoading;

  // Don't show loading if AuthGuard is already handling it
  // Only show loading if we have a user but are still loading profile data
  if (authLoading || (userLoading && !user)) {
    return null; // Let AuthGuard handle the loading screen
  }

  // Redirect to login if no user found (but don't show loading screen)
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard/settings"
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
              prefetch={true}
            >
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2">
              Reset Transaction PIN
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-md">
        {step === "request" && (
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IonIcon name="key-outline" size="32px" color="#eab308" />
              </div>
              <CardTitle className="text-xl">Forgot Your PIN?</CardTitle>
              <CardDescription className="text-sm">
                We'll send a 6-digit verification code to your email to reset your transaction PIN
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Email Address</p>
                <p className="font-medium text-sm">{userEmail}</p>
              </div>
              
              <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <IonIcon name="information-circle-outline" size="16px" className="text-amber-600 mt-0.5" />
                  <div className="text-xs">
                    <strong>Important:</strong> Check both your inbox and spam/junk folder for the verification code.
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRequestReset}
                disabled={isAnyLoading}
                className="w-full bg-green-500 hover:bg-green-600 transition-colors"
              >
                {isRequestLoading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Sending Code...</span>
                  </div>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "verify" && (
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IonIcon name="mail-outline" size="32px" color="#3b82f6" />
              </div>
              <CardTitle className="text-xl">Enter Verification Code</CardTitle>
              <CardDescription className="text-sm">
                Enter the 6-digit code we sent to your email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userEmail && <EmailReminderAlert email={userEmail} />}
              
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoComplete="one-time-code"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <IonIcon name="help-circle-outline" size="14px" className="mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p><strong>Can't find the email?</strong></p>
                    <ul className="space-y-0.5 ml-2">
                      <li>• Check your <strong>spam/junk folder</strong></li>
                      <li>• Look for emails from "TADA VTU Security"</li>
                      <li>• Code expires in 10 minutes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={!canVerify}
                className="w-full bg-green-500 hover:bg-green-600 transition-colors"
              >
                {isVerifyLoading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify Code"
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={isAnyLoading}
                className="w-full transition-colors"
              >
                Didn't receive code? Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "newpin" && (
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IonIcon name="lock-closed" size="32px" color="#22c55e" />
              </div>
              <CardTitle className="text-xl">Set New PIN</CardTitle>
              <CardDescription className="text-sm">
                Create a secure 4-digit transaction PIN
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPin" className="text-sm font-medium">New PIN</Label>
                <Input
                  id="newPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => handlePinChange(e.target.value, setNewPin)}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoComplete="new-password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPin" className="text-sm font-medium">Confirm PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => handlePinChange(e.target.value, setConfirmPin)}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoComplete="new-password"
                />
              </div>

              {newPin && confirmPin && newPin !== confirmPin && (
                <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <IonIcon name="alert-circle-outline" size="16px" className="text-red-600 mt-0.5" />
                    <div className="text-xs text-red-700 dark:text-red-300">
                      PINs do not match. Please try again.
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <IonIcon name="shield-checkmark-outline" size="16px" className="text-green-600 mt-0.5" />
                  <div className="text-xs text-green-700 dark:text-green-300">
                    <strong>Security tip:</strong> Choose a PIN that's easy for you to remember but hard for others to guess.
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSetNewPin}
                disabled={!canSave}
                className="w-full bg-green-500 hover:bg-green-600 transition-colors"
              >
                {isSaveLoading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Saving PIN...</span>
                  </div>
                ) : (
                  "Set New PIN"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
