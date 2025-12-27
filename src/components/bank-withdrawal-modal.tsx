"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "sonner";

interface Bank {
  id: number;
  code: string;
  name: string;
}

interface BankWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // Optional - we use authenticated user from API
  balance: number;
  onSuccess: () => void;
}

const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 500000;
const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export function BankWithdrawalModal({
  isOpen,
  onClose,
  balance,
  onSuccess,
}: BankWithdrawalModalProps) {
  const [step, setStep] = useState<"amount" | "bank" | "account" | "confirm" | "success">("amount");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [pin, setPin] = useState("");
  const [mounted, setMounted] = useState(false);

  // Flutterwave fees (calculated dynamically)
  const [fee, setFee] = useState(0);
  const [loadingFee, setLoadingFee] = useState(false);
  const totalDebit = parseFloat(amount || "0") + fee;

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return banks;
    return banks.filter((bank) =>
      bank.name.toLowerCase().includes(bankSearch.toLowerCase())
    );
  }, [banks, bankSearch]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBanks();
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep("amount");
      setAmount("");
      setSelectedBank(null);
      setAccountNumber("");
      setAccountName("");
      setPin("");
      setBankSearch("");
    }
  }, [isOpen]);

  // Fetch banks from Flutterwave (Nigerian banks)
  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const res = await fetch("/api/withdrawal/banks");
      const data = await res.json();
      if (data.status === "success" && data.data) {
        setBanks(data.data);
      }
    } catch {
      toast.error("Failed to load banks");
    } finally {
      setLoadingBanks(false);
    }
  };

  const verifyAccount = useCallback(async () => {
    if (!selectedBank || accountNumber.length !== 10) return;
    setVerifying(true);
    setAccountName("");
    try {
      const res = await fetch("/api/withdrawal/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, bankCode: selectedBank.code }),
      });
      const data = await res.json();
      if (res.ok && data.accountName) {
        setAccountName(data.accountName);
        toast.success("Account verified");
      } else {
        toast.error(data.error || "Could not verify account");
      }
    } catch {
      toast.error("Failed to verify account");
    } finally {
      setVerifying(false);
    }
  }, [selectedBank, accountNumber]);

  // Calculate Flutterwave transfer fee
  const calculateFee = async (amount: number) => {
    if (amount < MIN_WITHDRAWAL) return;
    setLoadingFee(true);
    try {
      const res = await fetch("/api/flutterwave/fee-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok && data.fee !== undefined) {
        setFee(data.fee);
      }
    } catch {
      // Fallback fee calculation if API fails
      setFee(amount <= 5000 ? 10 : amount <= 50000 ? 25 : 50);
    } finally {
      setLoadingFee(false);
    }
  };

  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      verifyAccount();
    }
  }, [accountNumber, selectedBank, verifyAccount]);

  // Calculate fee when amount changes
  useEffect(() => {
    const amountNum = parseFloat(amount || "0");
    if (amountNum >= MIN_WITHDRAWAL) {
      calculateFee(amountNum);
    } else {
      setFee(0);
    }
  }, [amount]);


  const handleAmountContinue = () => {
    const amountNum = parseFloat(amount);
    if (!amount || amountNum < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ₦${MIN_WITHDRAWAL}`);
      return;
    }
    if (amountNum > MAX_WITHDRAWAL) {
      toast.error(`Maximum withdrawal is ₦${MAX_WITHDRAWAL.toLocaleString()}`);
      return;
    }
    if (totalDebit > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setStep("bank");
  };

  const handleBankSelect = (bank: Bank) => {
    setSelectedBank(bank);
    setAccountName("");
    setAccountNumber("");
    setStep("account");
  };

  const handleAccountContinue = () => {
    if (accountNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit account number");
      return;
    }
    if (!accountName) {
      toast.error("Please wait for account verification");
      return;
    }
    setStep("confirm");
  };

  // Submit withdrawal via Flutterwave
  const handleSubmit = async () => {
    if (pin.length !== 4) {
      toast.error("Please enter your 4-digit PIN");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/withdrawal/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode: selectedBank?.code,
          accountNumber,
          accountName,
          amount: parseFloat(amount),
          pin,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setStep("success");
        onSuccess();
      } else {
        toast.error(data.message || "Withdrawal failed");
        if (data.message?.includes("PIN")) setPin("");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = () => {
    if (step === "bank") setStep("amount");
    else if (step === "account") setStep("bank");
    else if (step === "confirm") setStep("account");
    else onClose();
  };

  if (!isOpen || !mounted) return null;

  const getTitle = () => {
    switch (step) {
      case "amount": return "Withdraw Funds";
      case "bank": return "Select Bank";
      case "account": return "Account Details";
      case "confirm": return "Confirm Withdrawal";
      case "success": return "Success";
      default: return "Withdraw";
    }
  };

  const steps = ["amount", "bank", "account", "confirm"] as const;
  const currentStepIndex = steps.indexOf(step as typeof steps[number]);
  const stepLabels = ["Amount", "Bank", "Account", "Confirm"];

  const modalContent = (
    <div 
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 99999, backgroundColor: '#0a0a0a' }}
    >
      {/* Header */}
      <header className="shrink-0 border-b border-border" style={{ backgroundColor: '#141414' }}>
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto w-full">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
            type="button"
          >
            <IonIcon 
              name={step === "amount" ? "close-outline" : "arrow-back-outline"} 
              size="22px" 
            />
          </button>
          <h1 className="text-lg font-semibold text-foreground ml-2">{getTitle()}</h1>
        </div>
        
        {/* Step Indicator - only show for non-success steps */}
        {step !== "success" && (
          <div className="px-4 pb-4 max-w-lg mx-auto w-full">
            <div className="flex items-center justify-between">
              {steps.map((s, idx) => (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        idx < currentStepIndex 
                          ? "bg-green-500 text-white" 
                          : idx === currentStepIndex 
                            ? "bg-green-500 text-white" 
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {idx < currentStepIndex ? (
                        <IonIcon name="checkmark" size="16px" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${
                      idx <= currentStepIndex ? "text-green-500" : "text-muted-foreground"
                    }`}>
                      {stepLabels[idx]}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div 
                      className={`flex-1 h-0.5 mx-2 mt-[-16px] ${
                        idx < currentStepIndex ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          
          {/* Step 1: Amount */}
          {step === "amount" && (
            <>
              <Card className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <IonIcon name="wallet" size="24px" color="white" />
                    </div>
                    <div>
                      <p className="text-green-100 text-sm">Available Balance</p>
                      <h2 className="text-2xl font-bold text-white">
                        ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </h2>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transfer fees info */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10">
                <IonIcon name="information-circle-outline" size="20px" className="text-blue-500 shrink-0" />
                <p className="text-sm text-blue-500 font-medium">
                  Transfer fees apply (₦10-50 depending on amount)
                </p>
              </div>

              <Card className="border-border">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Quick Select</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {QUICK_AMOUNTS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAmount(value.toString())}
                          className={`px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium ${
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
                        min={MIN_WITHDRAWAL}
                        max={MAX_WITHDRAWAL}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Min: ₦{MIN_WITHDRAWAL.toLocaleString()} | Max: ₦{MAX_WITHDRAWAL.toLocaleString()}
                    </p>
                  </div>

                  {amount && parseFloat(amount) >= MIN_WITHDRAWAL && (
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium text-foreground">₦{parseFloat(amount).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Transfer Fee</span>
                        <span className="font-medium text-foreground">
                          {loadingFee ? (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
                              <span>Calculating...</span>
                            </div>
                          ) : (
                            `₦${fee.toLocaleString()}`
                          )}
                        </span>
                      </div>
                      <div className="border-t border-border pt-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">Total Debit</span>
                          <span className="font-bold text-red-500 text-lg">₦{totalDebit.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-muted-foreground">You'll Receive</span>
                          <span className="font-bold text-green-500">₦{parseFloat(amount || "0").toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleAmountContinue}
                    disabled={!amount || parseFloat(amount) < MIN_WITHDRAWAL || loadingFee}
                    className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      {loadingFee ? "Calculating fee..." : "Select Bank"}
                      {!loadingFee && <IonIcon name="arrow-forward" size="18px" />}
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </>
          )}


          {/* Step 2: Bank Selection - Full screen list, no dropdown */}
          {step === "bank" && (
            <Card className="border-border">
              <CardContent className="p-4 space-y-4">
                <div className="relative">
                  <IonIcon
                    name="search-outline"
                    size="18px"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <Input
                    type="text"
                    placeholder="Search banks..."
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="pl-10 bg-muted/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  {loadingBanks ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredBanks.length === 0 ? (
                    <div className="text-center py-12">
                      <IonIcon name="search" size="40px" className="text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No banks found</p>
                    </div>
                  ) : (
                    filteredBanks.map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => handleBankSelect(bank)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-green-500/50 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                          <IonIcon name="business" size="18px" className="text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground flex-1">{bank.name}</span>
                        <IonIcon name="chevron-forward" size="18px" className="text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Account Details */}
          {step === "account" && selectedBank && (
            <Card className="border-border">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <IonIcon name="business" size="18px" color="#22c55e" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Selected Bank</p>
                    <p className="font-medium text-foreground">{selectedBank.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("bank")}
                    className="text-green-500 text-sm font-medium"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Account Number</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter 10-digit account number"
                    value={accountNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAccountNumber(val);
                      if (val.length !== 10) setAccountName("");
                    }}
                    className="bg-background border-border h-12 text-lg tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground">
                    {accountNumber.length}/10 digits
                  </p>
                </div>

                {verifying && (
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                    <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Verifying account...</span>
                  </div>
                )}

                {accountName && !verifying && (
                  <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/30">
                    <div className="flex items-center gap-3">
                      <IonIcon name="checkmark-circle" size="24px" color="#22c55e" />
                      <div>
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p className="font-semibold text-foreground">{accountName}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAccountContinue}
                  disabled={!accountName || verifying}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                >
                  <span className="flex items-center gap-2">
                    Review & Confirm
                    <IonIcon name="arrow-forward" size="18px" />
                  </span>
                </Button>
              </CardContent>
            </Card>
          )}


          {/* Step 4: Confirm */}
          {step === "confirm" && (
            <Card className="border-border">
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IonIcon name="shield-checkmark" size="32px" color="#22c55e" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">₦{parseFloat(amount).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">+ ₦{fee} transfer fee</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium text-foreground">₦{parseFloat(amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transfer Fee</span>
                    <span className="font-medium text-foreground">₦{fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account</span>
                    <span className="font-medium text-foreground">{accountNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{accountName}</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-foreground">Total Debit</span>
                      <span className="font-bold text-red-500">₦{totalDebit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm text-muted-foreground">Recipient Gets</span>
                      <span className="font-bold text-green-500">₦{parseFloat(amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Enter 4-digit PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-2xl tracking-widest h-14"
                    autoFocus
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={pin.length !== 4 || processing}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    "Confirm Withdrawal"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Success */}
          {step === "success" && (
            <Card className="border-border">
              <CardContent className="py-12 text-center space-y-6">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <IonIcon name="checkmark-circle" size="48px" color="#22c55e" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Withdrawal Initiated</h2>
                  <p className="text-muted-foreground">Your transfer is being processed</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-foreground">₦{parseFloat(amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">To</span>
                    <span className="font-medium text-foreground">{accountName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-medium text-foreground">{selectedBank?.name}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This usually takes a few minutes. You&apos;ll receive a notification once complete.
                </p>
                <Button
                  onClick={onClose}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                >
                  Done
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );

  return createPortal(modalContent, document.body);
}
