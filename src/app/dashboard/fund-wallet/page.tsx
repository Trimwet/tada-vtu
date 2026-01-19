"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { useVirtualAccount } from "@/hooks/useVirtualAccount";
import { calculateBankTransferTotal } from "@/lib/api/flutterwave";
import dynamic from "next/dynamic";

const CheckDepositsButton = dynamic(
  () => import("@/components/CheckDepositsButton").then(mod => mod.CheckDepositsButton),
  { ssr: false }
);

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

interface FeeInfo {
  wallet_credit: number;
  service_fee: number;
  processing_fee: number;
  total_to_pay: number;
  merchant_pays_fee: boolean;
  fee_type?: 'flat' | 'percentage';
}

type PaymentMethod = "card" | "bank";

export default function FundWalletPage() {
  const searchParams = useSearchParams();
  const { user, isProfileLoaded } = useSupabaseUser();
  const { transactions } = useSupabaseTransactions(10);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null);
  const [loadingFees, setLoadingFees] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [copied, setCopied] = useState(false);
  const [bvn, setBvn] = useState("");
  const [showBvnInput, setShowBvnInput] = useState(false);
  const [tempAmount, setTempAmount] = useState("");
  const [showTempOption, setShowTempOption] = useState(false);
  const [accountOption, setAccountOption] = useState<'permanent' | 'temporary' | null>(null);

  // Virtual account hook
  const {
    virtualAccount,
    tempAccount,
    loading: vaLoading,
    creating: vaCreating,
    creatingTemp,
    error: vaError,
    createVirtualAccount,
    createTempAccount,
    clearTempAccount,
    copyAccountNumber
  } = useVirtualAccount();

  // Optimized fee fetching with caching
  const fetchFees = useCallback(async (fundAmount: number) => {
    if (!fundAmount || fundAmount < 100) {
      setFeeInfo(null);
      return;
    }

    // Simple client-side calculation for better performance
    if (fundAmount < 5000) {
      setFeeInfo({
        wallet_credit: fundAmount,
        service_fee: 30.50,
        processing_fee: 0,
        total_to_pay: fundAmount + 30.50,
        merchant_pays_fee: false,
        fee_type: 'flat',
      });
      return;
    }

    // Only fetch from API for percentage fees
    setLoadingFees(true);
    try {
      const res = await fetch(`/api/flutterwave/fee-check?amount=${fundAmount}&method=bank`);
      const data = await res.json();
      if (data.status === 'success') {
        setFeeInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch fees:', error);
    } finally {
      setLoadingFees(false);
    }
  }, []);

  // Debounced fee fetching
  useEffect(() => {
    const fundAmount = parseInt(amount);
    const debounce = setTimeout(() => fetchFees(fundAmount), 300);
    return () => clearTimeout(debounce);
  }, [amount, fetchFees]);

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

  const handleCreateVirtualAccount = async () => {
    if (!bvn || bvn.length !== 11) {
      toast.error("Please enter a valid 11-digit BVN");
      return;
    }
    const result = await createVirtualAccount(bvn);
    if (result) {
      toast.success("Virtual account created!", { description: "You can now fund via bank transfer" });
      setShowBvnInput(false);
      setBvn("");
      setAccountOption(null);
    }
    // Error toast is handled via useEffect below
  };

  const handleCreateTempAccount = async () => {
    const amt = parseInt(tempAmount);
    if (!amt || amt < 100) {
      toast.error("Please enter a valid amount (minimum ₦100)");
      return;
    }
    const result = await createTempAccount(amt);
    if (result) {
      toast.success("Temporary account created!", { description: "Transfer within 1 hour to fund your wallet" });
      setShowTempOption(false);
      setTempAmount("");
      setAccountOption(null);
    }
  };

  const formatExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes <= 0) return "Expired";
    if (minutes < 60) return `${minutes} min left`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
  };

  // Show toast when virtual account error occurs
  useEffect(() => {
    if (vaError) {
      // Map technical errors to user-friendly messages
      let friendlyMessage = vaError;
      if (vaError.toLowerCase().includes('invalid bvn')) {
        friendlyMessage = "The BVN you entered is invalid. Please check and try again.";
      } else if (vaError.toLowerCase().includes('bvn') && vaError.toLowerCase().includes('required')) {
        friendlyMessage = "BVN is required to create a virtual account.";
      }
      toast.error("Account creation failed", friendlyMessage);
    }
  }, [vaError]);

  const handleCopyAccount = async () => {
    const success = await copyAccountNumber();
    if (success) {
      setCopied(true);
      toast.success("Copied!", { description: "Account number copied to clipboard", confetti: false });
      setTimeout(() => setCopied(false), 2000);
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
                  {!isProfileLoaded ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="text-white/70 text-lg">Loading...</span>
                    </div>
                  ) : (
                    `₦${(user?.balance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
                  )}
                </h2>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod("bank")}
            className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === "bank"
              ? "border-green-500 bg-green-500/10"
              : "border-border hover:border-green-500/50"
              }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "bank" ? "bg-green-500/20" : "bg-muted"
                }`}>
                <IonIcon name="business" size="20px" color={paymentMethod === "bank" ? "#22c55e" : "#888"} />
              </div>
              <div className="text-center">
                <p className={`font-semibold text-sm ${paymentMethod === "bank" ? "text-green-500" : "text-foreground"}`}>
                  Bank Transfer
                </p>
                <p className="text-xs text-muted-foreground">₦30.50 fee</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod("card")}
            className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === "card"
              ? "border-green-500 bg-green-500/10"
              : "border-border hover:border-green-500/50"
              }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "card" ? "bg-green-500/20" : "bg-muted"
                }`}>
                <IonIcon name="card" size="20px" color={paymentMethod === "card" ? "#22c55e" : "#888"} />
              </div>
              <div className="text-center">
                <p className={`font-semibold text-sm ${paymentMethod === "card" ? "text-green-500" : "text-foreground"}`}>
                  Card/USSD
                </p>
                <p className="text-xs text-muted-foreground">1.4% fee</p>
              </div>
            </div>
          </button>
        </div>

        {/* Bank Transfer Section */}
        {paymentMethod === "bank" && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <IonIcon name="business" size="20px" color="#22c55e" />
                Bank Transfer
              </CardTitle>
              <CardDescription>
                Transfer to your dedicated account. ₦30.50 service fee.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {vaLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-muted-foreground">Loading...</span>
                </div>
              ) : virtualAccount ? (
                <>
                  {/* Permanent Virtual Account Details */}
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Bank</span>
                      <span className="font-semibold text-foreground">{virtualAccount.bank_name}</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-green-500 font-mono">
                          {virtualAccount.account_number}
                        </span>
                        <button
                          onClick={handleCopyAccount}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        >
                          <IonIcon
                            name={copied ? "checkmark" : "copy-outline"}
                            size="18px"
                            color={copied ? "#22c55e" : "#888"}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Account Name</span>
                      <span className="font-medium text-foreground text-sm">{virtualAccount.account_name}</span>
                    </div>
                  </div>

                  {/* Fee Info */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <IonIcon name="information-circle" size="18px" color="#3b82f6" className="mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-500">How it works</p>
                        <p className="text-muted-foreground mt-1">
                          Transfer any amount from your bank app. Your wallet will be credited automatically within 1-2 minutes.
                        </p>
                        <p className="text-muted-foreground mt-1">
                          <span className="text-green-500 font-semibold">₦30.50 service fee</span> - still cheaper than card payments!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Copy Button */}
                  <Button
                    onClick={handleCopyAccount}
                    className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                  >
                    <IonIcon name={copied ? "checkmark-circle" : "copy"} size="20px" />
                    <span className="ml-2">{copied ? "Copied!" : "Copy Account Number"}</span>
                  </Button>

                  {/* Check Deposits Button */}
                  <CheckDepositsButton />
                </>
              ) : tempAccount ? (
                <>
                  {/* Temporary Account Details */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <IonIcon name="time" size="18px" color="#f59e0b" />
                          </div>
                          <span className="text-sm font-semibold text-amber-600">Temporary Account</span>
                        </div>
                        <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-full">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-amber-700">
                            {formatExpiry(tempAccount.expiry_date)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Bank</span>
                            <span className="font-semibold text-foreground">{tempAccount.bank_name}</span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Account Number</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg text-green-500 font-mono tracking-wider">
                                {tempAccount.account_number}
                              </span>
                              <button
                                onClick={async () => {
                                  await navigator.clipboard.writeText(tempAccount.account_number);
                                  setCopied(true);
                                  toast.success("Copied!");
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                              >
                                <IonIcon
                                  name={copied ? "checkmark" : "copy-outline"}
                                  size="18px"
                                  color={copied ? "#22c55e" : "#888"}
                                />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Amount to Transfer</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xl text-blue-600">₦{parseFloat(tempAccount.amount).toLocaleString()}</span>
                              <button
                                onClick={async () => {
                                  await navigator.clipboard.writeText(parseFloat(tempAccount.amount).toString());
                                  toast.success("Amount copied!");
                                }}
                                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                              >
                                <IonIcon name="copy-outline" size="16px" color="#3b82f6" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Account Name</span>
                            <span className="font-medium text-foreground text-sm">{tempAccount.account_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                        <IonIcon name="warning" size="20px" color="#f59e0b" />
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold text-amber-600 mb-2">Important Instructions</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="text-amber-500 mt-1">•</span>
                            <span>Transfer exactly <span className="font-semibold text-blue-600">₦{parseFloat(tempAccount.amount).toLocaleString()}</span>. This includes the ₦30.50 service fee + bank processing charges.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-500 mt-1">•</span>
                            <span>This is a one-time account for this specific amount only</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-500 mt-1">•</span>
                            <span>Your wallet will be credited automatically after transfer</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={clearTempAccount}
                      className="flex-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                    >
                      <IonIcon name="refresh" size="18px" className="mr-2" />
                      Create New
                    </Button>
                    <Button
                      onClick={async () => {
                        await navigator.clipboard.writeText(tempAccount.account_number);
                        setCopied(true);
                        toast.success("Account number copied!");
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg"
                    >
                      <IonIcon name={copied ? "checkmark-circle" : "copy"} size="18px" className="mr-2" />
                      {copied ? "Copied!" : "Copy Details"}
                    </Button>
                  </div>

                  {/* Check Deposits Button */}
                  <CheckDepositsButton />
                </>
              ) : (
                <>
                  {/* Choose Account Type */}
                  {!accountOption && !showBvnInput && !showTempOption && (
                    <div className="space-y-4">
                      <div className="text-center py-2">
                        <h3 className="font-semibold text-foreground mb-2">Choose Account Type</h3>
                        <p className="text-sm text-muted-foreground">
                          Select how you want to fund your wallet via bank transfer
                        </p>
                      </div>

                      {/* Temporary Account Option */}
                      <button
                        onClick={() => {
                          setAccountOption('temporary');
                          setShowTempOption(true);
                        }}
                        className="w-full p-4 rounded-xl border-2 border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                            <IonIcon name="flash" size="20px" color="#888" className="group-hover:!text-green-500 transition-colors" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              Quick Transfer
                              <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Recommended</span>
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              No BVN required • Amount-specific • Expires in 1 hour
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Permanent Account Option */}
                      <button
                        onClick={() => {
                          setAccountOption('permanent');
                          setShowBvnInput(true);
                        }}
                        className="w-full p-4 rounded-xl border-2 border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                            <IonIcon name="shield-checkmark" size="20px" color="#888" className="group-hover:!text-green-500 transition-colors" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Permanent Account</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Requires BVN • Reusable • Transfer any amount anytime
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Temporary Account Form */}
                  {showTempOption && (
                    <div className="space-y-4">
                      <div className="text-center py-2">
                        <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                          <IonIcon name="flash" size="28px" color="#22c55e" />
                        </div>
                        <h3 className="font-semibold text-foreground">Quick Transfer</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enter the amount you want to fund
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Amount to Fund</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                          <Input
                            type="number"
                            placeholder="Enter amount (min ₦100)"
                            value={tempAmount}
                            onChange={(e) => setTempAmount(e.target.value)}
                            className="pl-8 h-12 text-lg font-semibold"
                            min="100"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {[500, 1000, 2000, 5000].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setTempAmount(amt.toString())}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${tempAmount === amt.toString()
                              ? "border-green-500 bg-green-500/10 text-green-500"
                              : "border-border hover:border-green-500/50"
                              }`}
                          >
                            ₦{amt.toLocaleString()}
                          </button>
                        ))}
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <IonIcon name="information-circle" size="18px" color="#3b82f6" className="mt-0.5" />
                          <div className="text-sm">
                            <p className="text-muted-foreground">
                              {tempAmount && parseInt(tempAmount) >= 100 ? (
                                <>
                                  A temporary account will be created. Transfer <span className="text-green-500 font-semibold">₦{calculateBankTransferTotal(parseInt(tempAmount)).totalToTransfer.toLocaleString()}</span> to get <span className="text-green-500 font-semibold">₦{parseInt(tempAmount).toLocaleString()}</span> in your wallet.
                                </>
                              ) : (
                                "Enter an amount to see the total including fees."
                              )}
                            </p>
                            <p className="text-muted-foreground mt-1">
                              Fee includes: <span className="text-blue-500 font-medium">₦30.50 TADA fee</span> (we absorb the bank charges!).
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowTempOption(false);
                            setTempAmount("");
                            setAccountOption(null);
                          }}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleCreateTempAccount}
                          disabled={creatingTemp || !tempAmount || parseInt(tempAmount) < 100}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
                        >
                          {creatingTemp ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Creating...
                            </div>
                          ) : (
                            "Generate Account"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Permanent Account (BVN) Form */}
                  {showBvnInput && (
                    <div className="space-y-4">
                      <div className="text-center py-2">
                        <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                          <IonIcon name="shield-checkmark" size="28px" color="#22c55e" />
                        </div>
                        <h3 className="font-semibold text-foreground">Permanent Account</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Create a reusable account for unlimited transfers
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">BVN (Bank Verification Number)</Label>
                        <Input
                          type="tel"
                          placeholder="Enter your 11-digit BVN"
                          value={bvn}
                          onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          maxLength={11}
                          className="h-12"
                        />
                        <p className="text-xs text-muted-foreground">
                          Your BVN is required by Flutterwave for account verification.
                        </p>
                      </div>

                      <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <div className="flex items-start gap-2">
                          <IonIcon name="shield-checkmark" size="18px" color="#f59e0b" className="mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-500">Your BVN is safe</p>
                            <p className="text-muted-foreground">
                              We don&apos;t store your BVN. It&apos;s sent directly to Flutterwave for verification.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowBvnInput(false);
                            setBvn("");
                            setAccountOption(null);
                          }}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleCreateVirtualAccount}
                          disabled={vaCreating || bvn.length !== 11}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
                        >
                          {vaCreating ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Creating...
                            </div>
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card Payment Section */}
        {paymentMethod === "card" && (
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <IonIcon name="card" size="20px" color="#22c55e" />
                Card / USSD Payment
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
                      className={`px-4 py-2 rounded-lg border transition-smooth text-sm font-medium ${amount === value.toString()
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
        )}

        {/* Fee Comparison */}
        <Card className="border-border bg-gradient-to-br from-green-500/5 to-emerald-500/5">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <IonIcon name="calculator" size="18px" color="#22c55e" />
              Fee Comparison
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                <span className="text-muted-foreground">₦10,000 via Bank Transfer</span>
                <span className="font-semibold text-green-500">₦10 fee</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">₦10,000 via Card</span>
                <span className="font-semibold text-orange-500">~₦189 fee</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Save up to <span className="text-green-500 font-semibold">95%</span> on fees with bank transfer!
              </p>
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
