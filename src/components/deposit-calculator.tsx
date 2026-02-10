"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";

export function DepositCalculator() {
  const [desiredAmount, setDesiredAmount] = useState("");

  const calculateFees = (amount: number) => {
    if (!amount || amount < 100) {
      return { platformFee: 0, flutterwaveFee: 0, totalToTransfer: 0, walletCredit: 0 };
    }

    // Platform fee: ₦25.50 for amounts under ₦5,000
    const platformFee = amount < 5000 ? 25.50 : Math.ceil(amount * 0.025 * 1.015); // 2.5% + VAT
    
    // Flutterwave fee: approximately ₦25 (varies by bank)
    const flutterwaveFee = 25;
    
    const totalToTransfer = amount + platformFee + flutterwaveFee;
    
    return {
      platformFee,
      flutterwaveFee,
      totalToTransfer,
      walletCredit: amount
    };
  };

  const amount = parseInt(desiredAmount) || 0;
  const fees = calculateFees(amount);

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <IonIcon name="calculator" size="20px" color="#3b82f6" />
          Deposit Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">How much do you want in your wallet?</Label>
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
        </div>

        {amount >= 100 && (
          <div className="space-y-3 pt-2">
            {/* Fee Breakdown */}
            <div className="bg-background rounded-xl p-4 border border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wallet Credit</span>
                <span className="font-semibold text-green-500">₦{fees.walletCredit.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="font-medium text-foreground">₦{fees.platformFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Flutterwave Fee (est.)</span>
                <span className="font-medium text-foreground">~₦{fees.flutterwaveFee}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Total to Transfer</span>
                  <span className="font-bold text-xl text-blue-600">₦{Math.ceil(fees.totalToTransfer).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <IonIcon name="information-circle" size="18px" color="#3b82f6" className="mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-blue-500 mb-1">Transfer exactly ₦{Math.ceil(fees.totalToTransfer).toLocaleString()}</p>
                  <p>
                    Flutterwave's fee varies by bank (₦20-30). If you transfer ₦{Math.ceil(fees.totalToTransfer).toLocaleString()}, 
                    you'll get approximately ₦{fees.walletCredit.toLocaleString()} in your wallet.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Copy Button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(Math.ceil(fees.totalToTransfer).toString());
                // You can add a toast here if needed
              }}
              className="w-full p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors flex items-center justify-center gap-2 text-blue-600 font-medium"
            >
              <IonIcon name="copy" size="18px" />
              Copy Amount (₦{Math.ceil(fees.totalToTransfer).toLocaleString()})
            </button>
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
