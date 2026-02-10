"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import { calculateBankTransferTotal } from "@/lib/api/flutterwave";

interface DepositCalculatorProps {
  currentBalance?: number;
}

export function DepositCalculator({ currentBalance = 0 }: DepositCalculatorProps) {
  const [desiredAmount, setDesiredAmount] = useState("");
  const [calculationMode, setCalculationMode] = useState<"add" | "target">("add");

  const amount = parseInt(desiredAmount) || 0;
  
  // Calculate based on mode
  const depositAmount = calculationMode === "target" 
    ? Math.max(0, amount - currentBalance) // Target mode: deposit = target - current
    : amount; // Add mode: deposit = amount entered

  const fees = depositAmount >= 100 ? calculateBankTransferTotal(depositAmount) : null;
  const finalBalance = currentBalance + (fees?.walletCredit || 0);

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <IonIcon name="calculator" size="20px" color="#3b82f6" />
          Deposit Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Balance Display */}
        {currentBalance > 0 && (
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Balance</span>
              <span className="font-semibold text-foreground">₦{currentBalance.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Calculation Mode Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCalculationMode("add")}
            className={`p-2 rounded-lg text-sm font-medium transition-all ${
              calculationMode === "add"
                ? "bg-blue-500 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Add to Balance
          </button>
          <button
            onClick={() => setCalculationMode("target")}
            className={`p-2 rounded-lg text-sm font-medium transition-all ${
              calculationMode === "target"
                ? "bg-blue-500 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Reach Target
          </button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {calculationMode === "add" 
              ? "How much do you want to add?" 
              : "What balance do you want to reach?"}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
            <Input
              type="number"
              placeholder={calculationMode === "add" ? "Enter amount to add" : "Enter target balance"}
              value={desiredAmount}
              onChange={(e) => setDesiredAmount(e.target.value)}
              className="pl-8 h-12 text-lg font-semibold"
              min="100"
            />
          </div>
        </div>

        {fees && depositAmount >= 100 && (
          <div className="space-y-3 pt-2">
            {/* Fee Breakdown */}
            <div className="bg-background rounded-xl p-4 border border-border space-y-2">
              {calculationMode === "target" && (
                <div className="flex items-center justify-between text-sm pb-2 border-b border-border">
                  <span className="text-muted-foreground">Amount to Deposit</span>
                  <span className="font-semibold text-blue-500">₦{depositAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wallet Credit</span>
                <span className="font-semibold text-green-500">₦{fees.walletCredit.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Platform Fee {fees.feeType === 'percentage' ? '(2.5% + VAT)' : '(Flat)'}
                </span>
                <span className="font-medium text-foreground">₦{fees.platformFee.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Total to Transfer</span>
                  <span className="font-bold text-xl text-blue-600">₦{Math.ceil(fees.totalToTransfer).toLocaleString()}</span>
                </div>
                {currentBalance > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">New Balance</span>
                    <span className="font-semibold text-green-500">₦{finalBalance.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <IonIcon name="information-circle" size="18px" color="#3b82f6" className="mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-blue-500 mb-1">Transfer exactly ₦{Math.ceil(fees.totalToTransfer).toLocaleString()}</p>
                  <p>
                    Your wallet will be credited with ₦{fees.walletCredit.toLocaleString()}.
                    {currentBalance > 0 && ` Your new balance will be ₦${finalBalance.toLocaleString()}.`}
                    {fees.feeType === 'flat' 
                      ? ' Flat fee applies for amounts under ₦5,000.' 
                      : ' Percentage fee applies for amounts ₦5,000 and above.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Copy Button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(Math.ceil(fees.totalToTransfer).toString());
              }}
              className="w-full p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors flex items-center justify-center gap-2 text-blue-600 font-medium"
            >
              <IonIcon name="copy" size="18px" />
              Copy Amount (₦{Math.ceil(fees.totalToTransfer).toLocaleString()})
            </button>
          </div>
        )}

        {amount > 0 && depositAmount < 100 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <IonIcon name="warning" size="18px" color="#f59e0b" className="mt-0.5" />
              <p className="text-xs text-amber-600">
                {calculationMode === "target" 
                  ? `You need to deposit at least ₦100. Your target (₦${amount.toLocaleString()}) is too close to your current balance (₦${currentBalance.toLocaleString()}).`
                  : "Minimum deposit is ₦100"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
