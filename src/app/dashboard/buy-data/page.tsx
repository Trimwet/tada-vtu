"use client";

import { useState, useEffect, useMemo } from "react";
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
import dynamic from "next/dynamic";
import { useDataPlans, DataPlan as MergedDataPlan } from "@/hooks/useDataPlans";

const CreatePinModal = dynamic(
  () => import("@/components/create-pin-modal").then(mod => mod.CreatePinModal),
  { ssr: false }
);
const VerifyPinModal = dynamic(
  () => import("@/components/verify-pin-modal").then(mod => mod.VerifyPinModal),
  { ssr: false }
);

// Data type labels for display
const DATA_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  sme: { label: "SME/Share", description: "Cheapest rates" },
  corporate: { label: "Corporate/CG", description: "Corporate gifting" },
  direct: { label: "Direct", description: "Standard plans" },
  awoof: { label: "Awoof/Gifting", description: "Special offers" },
  social: { label: "Social", description: "Social bundles" },
};

export default function BuyDataPage() {
  const { user, refreshUser } = useSupabaseUser();
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
  const [selectedType, setSelectedType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    plans: dataPlans,
    loading: loadingPlans,
    error: plansError
  } = useDataPlans({
    network: selectedNetwork,
    autoRefresh: true
  });

  // Reset selections when network changes
  useEffect(() => {
    setSelectedType("");
    setSelectedPlan("");
  }, [selectedNetwork]);

  // Extract unique data types from fetched plans
  const availableTypes = useMemo(() => {
    if (!dataPlans || dataPlans.length === 0) return [];

    const types = [...new Set(dataPlans.map((plan) => plan.type))];

    // Auto-select first available type if none selected
    if (types.length > 0 && !selectedType) {
      setTimeout(() => setSelectedType(types[0]), 0);
    }

    return types.map((type) => ({
      value: type,
      label: DATA_TYPE_LABELS[type.toLowerCase()]?.label || type.toUpperCase(),
      description: DATA_TYPE_LABELS[type.toLowerCase()]?.description || "",
      count: dataPlans.filter((p) => p.type === type).length,
    }));
  }, [dataPlans, selectedType]);

  // Filter plans by selected type
  const availablePlans = useMemo(() => {
    if (!selectedType || !dataPlans) return [];
    return dataPlans.filter((plan) => plan.type === selectedType);
  }, [dataPlans, selectedType]);

  const selectedPlanDetails = dataPlans.find((plan) => plan.id === selectedPlan);

  // Execute the actual purchase after PIN verification
  const executePurchase = async () => {
    if (!selectedPlanDetails) return;

    setIsProcessing(true);

    try {
      // For Inlomax, the ID in useDataPlans is 'serviceID-type'. For SMEPlug it's just 'id'.
      // The API endpoint handles both if the provider is specified.
      const planIdForPurchase = selectedPlanDetails.id.includes('-')
        ? selectedPlanDetails.id.split('-')[0]
        : selectedPlanDetails.id;

      const response = await fetch("/api/inlomax/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: selectedNetwork,
          phone: phoneNumber,
          planId: planIdForPurchase,
          amount: selectedPlanDetails.price,
          planName: selectedPlanDetails.size,
          userId: user?.id,
        }),
      });

      const result = await response.json();

      if (result.status) {
        await refreshUser();
        toast.payment("Data purchase successful!", `${selectedPlanDetails.size} ${selectedNetwork} data sent to ${phoneNumber}`);

        setPhoneNumber("");
        setSelectedPlan("");
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

    if (!selectedNetwork || !phoneNumber || !selectedPlan || !selectedPlanDetails) {
      toast.warning("Please fill all fields");
      return;
    }

    if (!user || (user.balance || 0) < selectedPlanDetails.price) {
      toast.error("Insufficient balance", `You need ₦${selectedPlanDetails.price.toLocaleString()} but have ₦${(user?.balance || 0).toLocaleString()}`);
      return;
    }

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
            Buy Data
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <IonIcon name="wifi" size="24px" color="#22c55e" />
                </div>
                <div>
                  <CardTitle className="text-xl">Buy Data</CardTitle>
                  <CardDescription>
                    Affordable data plans for all networks
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
            {/* Important Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <IonIcon
                  name="warning"
                  size="20px"
                  color="#f59e0b"
                  className="shrink-0 mt-0.5"
                />
                <div className="text-sm">
                  <p className="font-semibold text-amber-500 mb-1">Important Notice</p>
                  <p className="text-amber-200/80">
                    Please, don&apos;t send Airtel Awoof and Gifting to any number owing Airtel.
                    It will not deliver and you will not be refunded. Thank you for choosing TADA VTU.
                  </p>
                </div>
              </div>
            </div>

            {/* Service Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl mb-6">
              <Link
                href="/dashboard/buy-airtime"
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
              >
                <IonIcon name="call-outline" size="18px" />
                Airtime
              </Link>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-background text-foreground shadow-sm font-medium transition-all cursor-default"
              >
                <IonIcon name="wifi" size="18px" className="text-green-500" />
                Data
              </button>
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
                        onClick={() => {
                          setSelectedNetwork(network.value);
                          setSelectedPlan("");
                        }}
                        className={`p-3 rounded-xl border-2 transition-smooth ${isSelected
                          ? activeStyles
                          : "border-border hover:border-green-500/50"
                          }`}
                      >
                        <div className="text-center">
                          <div className={`font-semibold text-sm ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {network.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>


              {/* Data Type Selection - Dynamic based on available plans */}
              {selectedNetwork && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Data Type</Label>
                  {loadingPlans ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-3">
                      <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-muted-foreground text-sm animate-pulse">Loading data types for {selectedNetwork}...</p>
                    </div>
                  ) : availableTypes.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            setSelectedType(type.value);
                            setSelectedPlan("");
                          }}
                          className={`p-3 rounded-xl border-2 transition-smooth ${selectedType === type.value
                            ? "border-green-500 bg-green-500/10"
                            : "border-border hover:border-green-500/50"
                            }`}
                        >
                          <div className="text-center">
                            <div className="font-semibold text-sm text-foreground">
                              {type.label}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {type.count} plan{type.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <IonIcon
                        name="cloud-offline-outline"
                        size="28px"
                        className="mx-auto mb-2"
                      />
                      <p>No data plans available for {selectedNetwork}</p>
                      <p className="text-xs mt-1">Please try another network or refresh the page</p>
                    </div>
                  )}
                </div>
              )}

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

              {/* Data Plans - Dynamic from API */}
              {selectedNetwork && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Select Data Plan
                    {!loadingPlans && availablePlans.length > 0 && (
                      <span className="text-muted-foreground font-normal ml-2">
                        ({availablePlans.length} {selectedType ? `${selectedType.toUpperCase()} ` : ''}plans)
                      </span>
                    )}
                  </Label>
                  {loadingPlans ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-muted-foreground font-medium animate-pulse">Fetching best plans for you...</p>
                    </div>
                  ) : availablePlans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <IonIcon
                        name="cloud-offline-outline"
                        size="32px"
                        className="mx-auto mb-2"
                      />
                      <p>
                        {dataPlans.length === 0
                          ? `No plans available for ${selectedNetwork}`
                          : `No ${selectedType} plans for ${selectedNetwork}`
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1 thin-scrollbar">
                      {availablePlans.map((plan, idx) => (
                        <button
                          key={`plan-${idx}-${plan.id}`}
                          type="button"
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`p-3 rounded-xl border-2 transition-smooth text-left relative ${selectedPlan === plan.id
                            ? "border-green-500 bg-green-500/10"
                            : "border-border hover:border-green-500/50"
                            }`}
                        >
                          {selectedPlan === plan.id && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <IonIcon
                                name="checkmark"
                                size="12px"
                                color="white"
                              />
                            </div>
                          )}
                          <div className="font-bold text-foreground">
                            {plan.size}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {plan.validity}
                          </div>
                          <div className="font-semibold text-green-500 mt-1">
                            ₦{plan.price.toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}


              {/* Summary */}
              {selectedNetwork && selectedPlanDetails && phoneNumber && !loadingPlans && (
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
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium text-foreground capitalize">
                        {DATA_TYPE_LABELS[selectedType]?.label || selectedType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone Number</span>
                      <span className="font-medium text-foreground">
                        {phoneNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data Plan</span>
                      <span className="font-medium text-foreground">
                        {selectedPlanDetails.size}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validity</span>
                      <span className="font-medium text-foreground">
                        {selectedPlanDetails.validity}
                      </span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="font-bold text-green-500 text-lg">
                          ₦{selectedPlanDetails.price.toLocaleString()}
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
                  !selectedPlan ||
                  isProcessing ||
                  loadingPlans
                }
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IonIcon name="cart-outline" size="20px" />
                    Buy Data
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
        description={`Enter PIN to buy ${selectedPlanDetails?.size || ""} ${selectedNetwork} data`}
      />
    </div>
  );
}
