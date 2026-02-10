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

  const amount = parseInt(desiredAmount) || 0;
  const fees = amount >= 100 ? calculateBankTransferTotal(amount) : null;
  const finalBalance = currentBalance + (fees?.walletCredit || 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
            <IonIcon name="calculator" size="20px" color="#22c55e" />
          </div>
          <div>
            <CardTitle className="text-base">Deposit Calculator</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Calculate exact amount to transfer</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Balance Display */}
        {currentBalance > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Your Current Balance</span>
              <span className="font-bold text-foreground">₦{currentBalance.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">How much do you want to add?</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
            <Input
              type="number"
              placeholder="Enter amount (min ₦100)"
              value={desiredAmount}
              onChange={(e) => setDesiredAmount(e.target.value)}
              className="pl-8 h-12 text-lg font-semibold"
              min="100"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Example: Enter ₦1,000 to add one thousand naira to your wallet
          </p>
        </div>

        {fees && (
          <div className="space-y-3 pt-2">
            {/* Main Result - Most Important */}
            <div className="bg-green-500/10 border-2 border-green-500/30 rounded-xl p-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">💰 Transfer This Amount</p>
                <p className="text-3xl font-bold text-green-500 mb-2">
                  ₦{Math.ceil(fees.totalToTransfer).toLocaleString()}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(Math.ceil(fees.totalToTransfer).toString());
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <IonIcon name="copy" size="16px" />
                  Copy Amount
                </button>
              </div>
            </div>

            {/* Breakdown - Secondary Info */}
            <div className="bg-background rounded-xl p-4 border border-border space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Breakdown</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">You'll Get</span>
                  <span className="text-lg font-bold text-green-500">₦{fees.walletCredit.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-medium text-foreground">₦{fees.platformFee.toFixed(2)}</span>
                </div>

                {currentBalance > 0 && (
                  <>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">New Balance</span>
                        <span className="text-lg font-bold text-foreground">₦{finalBalance.toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Simple Explanation */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <IonIcon name="checkmark-circle" size="18px" color="#22c55e" className="mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-green-600 mb-1">
                    Transfer ₦{Math.ceil(fees.totalToTransfer).toLocaleString()} to get ₦{fees.walletCredit.toLocaleString()} in your wallet
                  </p>
                  <p>
                    {fees.feeType === 'flat' 
                      ? 'Flat ₦25.50 fee for deposits under ₦5,000' 
                      : '2.5% + VAT fee for deposits ₦5,000 and above'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {amount > 0 && amount < 100 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <IonIcon name="warning" size="18px" color="#f59e0b" className="mt-0.5" />
              <p className="text-xs text-amber-600">Minimum deposit is ₦100</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
