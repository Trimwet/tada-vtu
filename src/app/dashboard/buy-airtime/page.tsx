"use client";

import { useState, useEffect } from "react";
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
import { toast } from "@/lib/toast";
import { NETWORKS } from "@/lib/constants";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useTransactionPin } from "@/hooks/useTransactionPin";
import { useMaintenanceRedirect } from "@/hooks/useMaintenanceMode";
import dynamic from "next/dynamic";

const CreatePinModal = dynamic(
  () => import("@/components/create-pin-modal").then(mod => mod.CreatePinModal),
  { ssr: false }
);
const VerifyPinModal = dynamic(
  () => import("@/components/verify-pin-modal").then(mod => mod.VerifyPinModal),
  { ssr: false }
);

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function BuyAirtimePage() {
  // Redirect if maintenance mode is active
  useMaintenanceRedirect();
  
  const { user, refreshUser, isProfileLoaded } = useSupabaseUser();
  const {
    userPin,
    showCreatePin,
    setShowCreatePin,
    showVerifyPin,
    setShowVerifyPin,
    requirePin,
    onPinCreated,
    onPinVerified,
  } = useTransactionPin();

  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Execute the actual purchase after PIN verification
  const executePurchase = async (verifiedPin: string) => {
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount < 50) {
      toast.error("Minimum airtime amount is ₦50");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/inlomax/airtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: selectedNetwork,
          phone: phoneNumber,
          amount: numAmount,
          userId: user?.id,
          pin: verifiedPin,
        }),
      });

      const result = await response.json();

      if (result.status) {
        await refreshUser();
        toast.payment("Airtime purchase successful!", `₦${numAmount.toLocaleString()} ${selectedNetwork} airtime sent to ${phoneNumber}`);

        setPhoneNumber("");
        setAmount("");
        setSelectedNetwork("");
      } else {
        toast.error(result.message || "Purchase failed");
      }
    } catch (error) {
      toast.error("Network error", "Please try again");
      console.error("Purchase error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseInt(amount);
    if (!selectedNetwork || !phoneNumber || !numAmount) {
      toast.warning("Please fill all fields");
      return;
    }

    if (numAmount < 50) {
      toast.error("Minimum airtime amount is ₦50");
      return;
    }

    if (!user || (user.balance || 0) < numAmount) {
      toast.error("Insufficient balance", `You need ₦${numAmount.toLocaleString()} but have ₦${(user?.balance || 0).toLocaleString()}`);
      return;
    }

    requirePin(executePurchase);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center h-14 px-4">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 hover:bg-muted active:bg-muted/80 rounded-lg transition-smooth lg:hidden touch-target"
          >
            <IonIcon name="arrow-back-outline" size="20px" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">
            Buy Airtime
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <IonIcon name="call" size="24px" color="#22c55e" />
                </div>
                <div>
                  <CardTitle className="text-xl">Buy Airtime</CardTitle>
                  <CardDescription>
                    Instant airtime top-up for all networks
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-bold text-green-500">
                  {!isProfileLoaded ? (
                    <span className="inline-block h-5 w-24 bg-green-500/20 animate-pulse rounded" />
                  ) : (
                    `₦${(user?.balance || 0).toLocaleString()}`
                  )}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Service Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl mb-6">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-background text-foreground shadow-sm font-medium transition-all cursor-default"
              >
                <IonIcon name="call" size="18px" className="text-green-500" />
                Airtime
              </button>
              <Link
                href="/dashboard/buy-data"
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
              >
                <IonIcon name="wifi-outline" size="18px" />
                Data
              </Link>
            </div>

            <form onSubmit={handlePurchase} className="space-y-6">
              {/* Network Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Network</Label>
                <div className="grid grid-cols-4 gap-2">
                  {NETWORKS.map((network) => {
                    const isSelected = selectedNetwork === network.value;
                    let activeStyles = "border-green-500 bg-green-500/10";

                    if (isSelected) {
                      if (network.value === "MTN") activeStyles = "border-yellow-500 bg-yellow-500/10";
                      if (network.value === "AIRTEL") activeStyles = "border-red-500 bg-red-500/10";
                      if (network.value === "GLO") activeStyles = "border-green-500 bg-green-500/10";
                      if (network.value === "9MOBILE") activeStyles = "border-emerald-400 bg-emerald-400/10";
                    }

                    return (
                      <button
                        key={network.value}
                        type="button"
                        onClick={() => setSelectedNetwork(network.value)}
                        className={`p-3 rounded-xl border-2 transition-smooth ${
                          isSelected
                            ? activeStyles
                            : "border-border hover:border-green-500/50"
                        }`}
                      >
                        <div className="text-center">
                          <div className={`font-semibold text-xs truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {network.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <div className="relative">
                  <IonIcon
                    name="call-outline"
                    size="18px"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10 bg-background border-border"
                    required
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount (min ₦50)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 bg-background border-border"
                    min="50"
                    required
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => handleQuickAmount(quickAmount)}
                      className={`p-2 rounded-lg border-2 transition-smooth text-sm font-medium ${
                        parseInt(amount) === quickAmount
                          ? "border-green-500 bg-green-500/10 text-green-600"
                          : "border-border hover:border-green-500/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      ₦{quickAmount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {selectedNetwork && amount && phoneNumber && parseInt(amount) >= 50 && (
                <div className="bg-muted/50 p-4 rounded-xl space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <IonIcon
                      name="receipt-outline"
                      size="18px"
                      color="#22c55e"
                    />
                    Purchase Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network</span>
                      <span className="font-medium text-foreground">
                        {selectedNetwork}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone Number</span>
                      <span className="font-medium text-foreground">
                        {phoneNumber}
                      </span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="font-bold text-green-500 text-lg">
                          ₦{parseInt(amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-12 transition-smooth"
                disabled={
                  !selectedNetwork ||
                  !phoneNumber ||
                  !amount ||
                  parseInt(amount) < 50 ||
                  isProcessing
                }
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin animate-[spin_0.5s_linear_infinite]"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IonIcon name="call-outline" size="20px" />
                    Buy Airtime
                  </div>
                )}
              </Button>

              {/* Save Beneficiary */}
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border bg-background"
                />
                Save as beneficiary for quick access
              </label>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* PIN Modals */}
      <CreatePinModal
        userId={user?.id || ""}
        isOpen={showCreatePin}
        onClose={() => setShowCreatePin(false)}
        onSuccess={onPinCreated}
        canSkip={false}
      />

      <VerifyPinModal
        userPin={userPin}
        isOpen={showVerifyPin}
        onClose={() => setShowVerifyPin(false)}
        onVerified={onPinVerified}
        title="Authorize Purchase"
        description={`Enter PIN to buy ₦${amount} ${selectedNetwork} airtime`}
      />
    </div>
  );
}