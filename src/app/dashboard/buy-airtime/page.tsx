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
import { toast } from "@/lib/toast";
import { NETWORKS } from "@/lib/constants";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useTransactionPin } from "@/hooks/useTransactionPin";
import { CreatePinModal } from "@/components/create-pin-modal";
import { VerifyPinModal } from "@/components/verify-pin-modal";
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 5000];

export default function BuyAirtimePage() {
  const { user, refreshUser } = useSupabaseUser();
  const {
    userPin,
    showCreatePin,
    showVerifyPin,
    setShowCreatePin,
    setShowVerifyPin,
    requirePin,
    onPinVerified,
    onPinCreated,
  } = useTransactionPin();

  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const executePurchase = async () => {
    const numAmount = parseInt(amount);

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
        }),
      });

      const result = await response.json();

      if (result.status) {
        // Refresh user data to get updated balance
        await refreshUser();
        toast.payment("Airtime purchase successful!", `₦${numAmount} ${selectedNetwork} airtime sent to ${phoneNumber}`);
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

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedNetwork || !phoneNumber || !amount) {
      toast.warning("Please fill all fields");
      return;
    }

    const numAmount = parseInt(amount);
    if (numAmount < 50) {
      toast.warning("Minimum amount is ₦50");
      return;
    }

    if (numAmount > 50000) {
      toast.warning("Maximum amount is ₦50,000");
      return;
    }

    // Check wallet balance
    if (!user || (user.balance || 0) < numAmount) {
      toast.error("Insufficient balance", `You need ₦${numAmount.toLocaleString()} but have ₦${(user?.balance || 0).toLocaleString()}`);
      return;
    }

    // Require PIN verification before purchase
    requirePin(executePurchase);
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
                  ₦{(user?.balance || 0).toLocaleString()}
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
                  {NETWORKS.map((network) => (
                    <button
                      key={network.value}
                      type="button"
                      onClick={() => setSelectedNetwork(network.value)}
                      className={`p-3 rounded-xl border-2 transition-smooth ${
                        selectedNetwork === network.value
                          ? "border-green-500 bg-green-500/10"
                          : "border-border hover:border-green-500/50"
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-sm text-foreground">
                          {network.label}
                        </div>
                      </div>
                    </button>
                  ))}
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    ₦
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 bg-background border-border text-lg font-semibold"
                    min="50"
                    max="50000"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Min: ₦50 • Max: ₦50,000
                </p>
              </div>

              {/* Quick Amounts */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quick Select</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleQuickAmount(value)}
                      className={`px-4 py-2 rounded-lg border transition-smooth text-sm font-medium ${
                        amount === value.toString()
                          ? "border-green-500 bg-green-500/10 text-green-500"
                          : "border-border hover:border-green-500/50 text-foreground"
                      }`}
                    >
                      ₦{value.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {selectedNetwork &&
                phoneNumber &&
                amount &&
                parseInt(amount) >= 50 && (
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
                        <span className="text-muted-foreground">
                          Phone Number
                        </span>
                        <span className="font-medium text-foreground">
                          {phoneNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium text-foreground">
                          ₦{parseInt(amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-border pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-foreground">
                            Total
                          </span>
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
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IonIcon name="flash-outline" size="20px" />
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

        {/* Recent Beneficiaries */}
        <Card className="border-border mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IonIcon name="people-outline" size="18px" color="#22c55e" />
              Recent Beneficiaries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: "My MTN", number: "08012345678", network: "MTN" },
                { name: "Mom", number: "08098765432", network: "Airtel" },
                { name: "Office Line", number: "08055544433", network: "Glo" },
              ].map((beneficiary, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setPhoneNumber(beneficiary.number);
                    setSelectedNetwork(beneficiary.network.toUpperCase());
                    toast.info(`Selected ${beneficiary.name}`);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-green-500/50 hover:bg-muted/50 transition-smooth text-left"
                >
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                    <span className="text-green-500 font-semibold text-sm">
                      {beneficiary.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {beneficiary.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {beneficiary.number}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {beneficiary.network}
                  </span>
                </button>
              ))}
            </div>
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
