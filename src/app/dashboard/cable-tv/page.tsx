"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useTransactionPin } from "@/hooks/useTransactionPin";
import { CreatePinModal } from "@/components/create-pin-modal";
import { VerifyPinModal } from "@/components/verify-pin-modal";

interface CablePlan {
  serviceID: string;
  cablePlan: string;
  cable: string;
  amount: string;
  discount: string;
}

// Cable providers with their display info
const CABLE_PROVIDERS = [
  { value: "DSTV", label: "DSTV", icon: "tv" },
  { value: "GOTV", label: "GOTV", icon: "tv" },
  { value: "STARTIMES", label: "Startimes", icon: "tv" },
];

export default function CableTVPage() {
  const { user, refreshUser } = useSupabaseUser();
  const { userPin, showCreatePin, setShowCreatePin, showVerifyPin, setShowVerifyPin, requirePin, onPinCreated, onPinVerified } = useTransactionPin();

  const [selectedProvider, setSelectedProvider] = useState("");
  const [iucNumber, setIucNumber] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<CablePlan | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cablePlans, setCablePlans] = useState<CablePlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Fetch cable plans when provider changes
  useEffect(() => {
    if (!selectedProvider) {
      setCablePlans([]);
      return;
    }

    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const response = await fetch("/api/inlomax/services");
        const result = await response.json();
        
        if (result.status === "success" && result.data?.cablePlans) {
          const providerPlans = result.data.cablePlans.filter(
            (plan: CablePlan) => plan.cable.toUpperCase() === selectedProvider
          );
          setCablePlans(providerPlans);
        }
      } catch (error) {
        console.error("Failed to fetch cable plans:", error);
        toast.error("Failed to load plans");
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [selectedProvider]);


  const verifyIUC = async () => {
    if (!selectedPlan || !iucNumber || iucNumber.length < 10) return;

    setIsVerifying(true);
    setCustomerName("");
    
    try {
      const response = await fetch("/api/inlomax/cable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          serviceID: selectedPlan.serviceID,
          iucNum: iucNumber,
        }),
      });
      const result = await response.json();
      
      if (result.status) {
        setCustomerName(result.data?.customerName || "Customer");
        toast.success("IUC number verified!");
      } else {
        toast.error(result.message || "Verification failed");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const parseAmount = (amount: string): number => {
    return parseFloat(amount.replace(/,/g, "")) || 0;
  };

  const executePurchase = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);

    const amount = parseAmount(selectedPlan.amount);

    try {
      const response = await fetch("/api/inlomax/cable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceID: selectedPlan.serviceID,
          iucNum: iucNumber,
          amount: amount,
          planName: selectedPlan.cablePlan,
          userId: user?.id,
        }),
      });

      const result = await response.json();
      if (result.status) {
        await refreshUser();
        toast.success("Cable subscription successful!", {
          description: `${selectedPlan.cablePlan} activated for ${iucNumber}`,
        });
        setIucNumber("");
        setSelectedPlan(null);
        setCustomerName("");
        setSelectedProvider("");
      } else {
        toast.error(result.message || "Purchase failed");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProvider || !iucNumber || !selectedPlan) {
      toast.error("Please fill all fields");
      return;
    }

    const amount = parseAmount(selectedPlan.amount);
    
    if (!user || (user.balance || 0) < amount) {
      toast.error("Insufficient balance", {
        description: `You need ₦${amount.toLocaleString()} but have ₦${(user?.balance || 0).toLocaleString()}`,
      });
      return;
    }
    
    requirePin(executePurchase);
  };

  const selectedAmount = selectedPlan ? parseAmount(selectedPlan.amount) : 0;


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg transition-smooth lg:hidden">
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">Cable TV</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <IonIcon name="tv" size="24px" color="#a855f7" />
                </div>
                <div>
                  <CardTitle className="text-xl">Cable TV Subscription</CardTitle>
                  <CardDescription>DSTV, GOTV, Startimes & more</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-bold text-green-500">₦{(user?.balance || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handlePurchase} className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Provider</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CABLE_PROVIDERS.map((provider) => (
                    <button
                      key={provider.value}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(provider.value);
                        setSelectedPlan(null);
                        setCustomerName("");
                      }}
                      className={`p-3 rounded-xl border-2 transition-smooth ${
                        selectedProvider === provider.value
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-border hover:border-purple-500/50"
                      }`}
                    >
                      <div className="text-center">
                        <IonIcon
                          name="tv"
                          size="24px"
                          className={selectedProvider === provider.value ? "text-purple-500" : "text-muted-foreground"}
                        />
                        <div className="font-semibold text-sm text-foreground mt-1">{provider.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Selection */}
              {selectedProvider && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Plan</Label>
                  {loadingPlans ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading plans...</p>
                    </div>
                  ) : cablePlans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <IonIcon name="cloud-offline-outline" size="32px" className="mx-auto mb-2" />
                      <p>No plans available for {selectedProvider}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto thin-scrollbar">
                      {cablePlans.map((plan) => (
                        <button
                          key={plan.serviceID}
                          type="button"
                          onClick={() => setSelectedPlan(plan)}
                          className={`p-3 rounded-xl border-2 transition-smooth text-left ${
                            selectedPlan?.serviceID === plan.serviceID
                              ? "border-purple-500 bg-purple-500/10"
                              : "border-border hover:border-purple-500/50"
                          }`}
                        >
                          <div className="font-semibold text-foreground">{plan.cablePlan}</div>
                          <div className="font-bold text-purple-500 mt-1">₦{parseAmount(plan.amount).toLocaleString()}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}


              {/* IUC Number */}
              {selectedPlan && (
                <div className="space-y-2">
                  <Label htmlFor="iuc" className="text-sm font-medium">Smart Card / IUC Number</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <IonIcon name="card-outline" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="iuc"
                        type="text"
                        placeholder="Enter IUC number"
                        value={iucNumber}
                        onChange={(e) => {
                          setIucNumber(e.target.value);
                          setCustomerName("");
                        }}
                        className="pl-10 bg-background border-border"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={verifyIUC}
                      disabled={!iucNumber || iucNumber.length < 10 || isVerifying}
                      className="border-purple-500 text-purple-500 hover:bg-purple-500/10"
                    >
                      {isVerifying ? (
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                  {customerName && (
                    <p className="text-sm text-green-500 flex items-center gap-1">
                      <IonIcon name="checkmark-circle" size="16px" /> {customerName}
                    </p>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedPlan && iucNumber && (
                <div className="bg-muted/50 p-4 rounded-xl space-y-2 text-sm">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <IonIcon name="receipt-outline" size="18px" color="#a855f7" /> Summary
                  </h3>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium">{selectedProvider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IUC Number</span>
                    <span className="font-medium">{iucNumber}</span>
                  </div>
                  {customerName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-medium">{customerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{selectedPlan.cablePlan}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-purple-500 text-lg">₦{selectedAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold h-12"
                disabled={!selectedProvider || !iucNumber || !selectedPlan || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <IonIcon name="tv-outline" size="20px" className="mr-2" />
                    Subscribe Now
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <CreatePinModal userId={user?.id || ""} isOpen={showCreatePin} onClose={() => setShowCreatePin(false)} onSuccess={onPinCreated} canSkip={false} />
      <VerifyPinModal userPin={userPin} isOpen={showVerifyPin} onClose={() => setShowVerifyPin(false)} onVerified={onPinVerified} title="Authorize Subscription" description={`Enter PIN to subscribe to ${selectedPlan?.cablePlan || ""}`} />
    </div>
  );
}
