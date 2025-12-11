"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import {
  useSupabaseUser,
  useSupabaseTransactions,
} from "@/hooks/useSupabaseUser";
import { useFlutterwavePayment } from "@/hooks/use-flutterwave";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

interface FeeInfo {
  wallet_credit: number;
  service_fee: number;
  processing_fee: number;
  total_to_pay: number;
  merchant_pays_fee: boolean;
}

export default function FundWalletPage() {
  const searchParams = useSearchParams();
  const { user } = useSupabaseUser();
  const { transactions } = useSupabaseTransactions(10);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null);
  const [loadingFees, setLoadingFees] = useState(false);

  // Fetch fee info when amount changes
  useEffect(() => {
    const fetchFees = async () => {
      const fundAmount = parseInt(amount);
      if (!fundAmount || fundAmount < 100) {
        setFeeInfo(null);
        return;
      }

      setLoadingFees(true);
      try {
        const res = await fetch(`/api/flutterwave/fee-check?amount=${fundAmount}`);
        const data = await res.json();
        if (data.status === 'success') {
          setFeeInfo(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch fees:', error);
      } finally {
        setLoadingFees(false);
      }
    };

    const debounce = setTimeout(fetchFees, 300);
    return () => clearTimeout(debounce);
  }, [amount]);

  const { initiatePayment, redirectToPayment, loading: paymentLoading } = useFlutterwavePayment();

  // Handle payment callback
  useEffect(() => {
    const status = searchParams.get("status");
    const tx_ref = searchParams.get("tx_ref") || searchParams.get("transaction_id");

    const handlePaymentCallback = async () => {
      if (status === "successful" && tx_ref) {
        try {
          const response = await fetch(`/api/flutterwave/verify?tx_ref=${tx_ref}`);
          const result = await response.json();
          
          if (result.status === "success") {
            toast.payment(`Payment successful!`, `₦${result.data?.amount?.toLocaleString() || ''} added to your wallet`);
            setTimeout(() => {
              window.location.href = "/dashboard/fund-wallet";
            }, 2000);
          } else {
            toast.error("Payment verification failed", "Contact support if you were debited");
            window.history.replaceState({}, "", "/dashboard/fund-wallet");
          }
        } catch {
          toast.info("Payment processing", "Your wallet will be credited shortly");
          window.history.replaceState({}, "", "/dashboard/fund-wallet");
        }
        localStorage.removeItem("pending_payment");
      } else if (status === "cancelled") {
        toast.warning("Payment cancelled", "You can try again anytime");
        localStorage.removeItem("pending_payment");
        window.history.replaceState({}, "", "/dashboard/fund-wallet");
      }
    };

    if (status) handlePaymentCallback();
  }, [searchParams]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleFundWallet = async () => {
    const fundAmount = parseInt(amount);
    if (!fundAmount || fundAmount < 100) {
      toast.error("Minimum amount is ₦100");
      return;
    }
    if (!user?.email) {
      toast.error("Please login to continue");
      return;
    }

    setIsProcessing(true);
    try {
      const paymentLink = await initiatePayment({
        amount: fundAmount,
        email: user.email || "",
        name: user.full_name || "User",
        phone: user.phone_number || "",
        redirect_url: `${window.location.origin}/dashboard/fund-wallet?status=successful`,
        meta: { user_id: user.id, type: "wallet_funding" },
      });

      if (paymentLink) {
        redirectToPayment(paymentLink);
      } else {
        toast.error("Failed to initiate payment");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  const deposits = transactions.filter((t) => t.type === "deposit");

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return `Today, ${date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`;
    if (days === 1) return "Yesterday";
    return date.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center h-14 px-4">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg lg:hidden">
            <IonIcon name="arrow-back-outline" size="20px" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">Fund Wallet</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <IonIcon name="wallet" size="24px" color="white" />
              </div>
              <div>
                <p className="text-green-100 text-sm">Current Balance</p>
                <h2 className="text-2xl font-bold text-white">
                  ₦{(user?.balance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fund Wallet Card */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <IonIcon name="card" size="20px" color="#22c55e" />
              Fund Your Wallet
            </CardTitle>
            <CardDescription>Pay with card, bank transfer, or USSD via Flutterwave</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Select</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">Or enter custom amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 bg-background border-border text-lg font-semibold h-12"
                  min="100"
                />
              </div>
            </div>

            {amount && parseInt(amount) >= 100 && (
              <div className="bg-muted/50 rounded-lg p-4">
                {loadingFees ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Calculating...</span>
                  </div>
                ) : feeInfo ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Wallet Credit</span>
                      <span className="font-bold text-foreground">₦{feeInfo.wallet_credit.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Service Fee</span>
                      <span className="font-medium text-orange-500">₦{feeInfo.service_fee.toLocaleString()}</span>
                    </div>
                    {feeInfo.processing_fee > 0 && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-muted-foreground">Payment Processing</span>
                        <span className="font-medium text-orange-500">₦{feeInfo.processing_fee.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-border mt-3 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total to Pay</span>
                        <span className="font-bold text-green-500 text-lg">₦{feeInfo.total_to_pay.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ₦{feeInfo.wallet_credit.toLocaleString()} will be credited to your wallet
                    </p>
                  </>
                ) : null}
              </div>
            )}

            <Button
              onClick={handleFundWallet}
              disabled={!amount || parseInt(amount) < 100 || isProcessing || paymentLoading || loadingFees || !feeInfo}
              className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
            >
              {isProcessing || paymentLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <IonIcon name="card-outline" size="20px" />
                  Pay ₦{feeInfo ? feeInfo.total_to_pay.toLocaleString() : "0"}
                </div>
              )}
            </Button>

            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <IonIcon name="card" size="14px" />
                <span>Card</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <IonIcon name="business" size="14px" />
                <span>Bank</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <IonIcon name="phone-portrait" size="14px" />
                <span>USSD</span>
              </div>
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-muted-foreground">Secured by Flutterwave</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Deposits */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IonIcon name="time-outline" size="18px" color="#22c55e" />
              Recent Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <div className="text-center py-8">
                <IonIcon name="wallet-outline" size="40px" className="text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No deposits yet</p>
                <p className="text-xs text-muted-foreground mt-1">Fund your wallet to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deposits.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                        <IonIcon name="arrow-down" size="20px" color="#22c55e" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">₦{Math.abs(item.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-green-500">Completed</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border-border bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <IonIcon name="help-circle" size="20px" color="#3b82f6" className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Need help?</p>
                <p className="text-muted-foreground">
                  If your deposit hasn&apos;t reflected after 5 minutes, please contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
