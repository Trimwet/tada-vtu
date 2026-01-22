"use client";

import { useState } from "react";
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

export default function ResetPinPage() {
  const { user } = useSupabaseUser();
  const [step, setStep] = useState<"request" | "verify" | "newpin">("request");
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const handleRequestReset = async () => {
    if (!user?.email) {
      toast.error("User email not found. Please login again.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          email: user.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Verification code sent!", {
          description: "Check your email (including spam folder) for the code.",
        });
        setStep("verify");
      } else {
        toast.error(data.message || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Error requesting reset:", error);
      toast.error("Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!user?.email) {
      toast.error("User email not found. Please login again.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: user.email,
          otp: otp,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Code verified!");
        setStep("newpin");
      } else {
        toast.error(data.message || "Invalid verification code");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("PIN must be 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    if (!user?.email) {
      toast.error("User email not found. Please login again.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          email: user.email,
          otp: otp,
          newPin: newPin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("PIN reset successfully!");
        
        // Reset loading state before redirect
        setIsLoading(false);
        
        // Redirect to settings after a short delay
        setTimeout(() => {
          window.location.href = "/dashboard/settings";
        }, 1000);
      } else {
        toast.error(data.message || "Failed to reset PIN");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error resetting PIN:", error);
      toast.error("Failed to reset PIN");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard/settings"
              className="p-2 -ml-2 hover:bg-muted rounded-lg"
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
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IonIcon name="key-outline" size="32px" color="#eab308" />
              </div>
              <CardTitle>Forgot Your PIN?</CardTitle>
              <CardDescription>
                We'll send a verification code to your email to reset your PIN
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <Button
                onClick={handleRequestReset}
                disabled={isLoading}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "verify" && (
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IonIcon name="mail-outline" size="32px" color="#3b82f6" />
              </div>
              <CardTitle>Enter Verification Code</CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to {user?.email}. Check your spam folder if you don't see it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest"
              />
              <div className="text-xs text-muted-foreground text-center">
                💡 Can't find the email? Check your spam/junk folder
              </div>
              <Button
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                Verify Code
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep("request")}
                className="w-full"
              >
                Resend Code
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "newpin" && (
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IonIcon name="lock-closed" size="32px" color="#22c55e" />
              </div>
              <CardTitle>Set New PIN</CardTitle>
              <CardDescription>
                Create a new 4-digit transaction PIN
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, ""))
                  }
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              <Button
                onClick={handleSetNewPin}
                disabled={
                  isLoading || newPin.length !== 4 || confirmPin.length !== 4
                }
                className="w-full bg-green-500 hover:bg-green-600"
              >
                {isLoading ? "Saving..." : "Set New PIN"}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
