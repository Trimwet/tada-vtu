"use client";

import { IonIcon } from "@/components/ion-icon";

interface SavingsBadgeProps {
  originalPrice: number;
  ourPrice: number;
  className?: string;
}

export function SavingsBadge({ originalPrice, ourPrice, className = "" }: SavingsBadgeProps) {
  const savings = originalPrice - ourPrice;
  const savingsPercent = Math.round((savings / originalPrice) * 100);
  
  if (savings <= 0) return null;
  
  return (
    <div className={`inline-flex items-center gap-1 bg-green-500/10 text-green-500 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <IonIcon name="trending-down" size="12px" />
      <span>Save ₦{savings.toLocaleString()} ({savingsPercent}%)</span>
    </div>
  );
}

// Cashback indicator for transactions
interface CashbackBadgeProps {
  amount: number;
  percentage?: number;
  className?: string;
}

export function CashbackBadge({ amount, percentage, className = "" }: CashbackBadgeProps) {
  if (amount <= 0) return null;
  
  return (
    <div className={`inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <IonIcon name="gift" size="12px" />
      <span>+₦{amount.toLocaleString()} cashback{percentage ? ` (${percentage}%)` : ''}</span>
    </div>
  );
}

// Price comparison component
interface PriceComparisonProps {
  networkPrice: number;
  ourPrice: number;
  showLabel?: boolean;
}

export function PriceComparison({ networkPrice, ourPrice, showLabel = true }: PriceComparisonProps) {
  const savings = networkPrice - ourPrice;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-foreground">₦{ourPrice.toLocaleString()}</span>
        {savings > 0 && (
          <span className="text-sm text-muted-foreground line-through">₦{networkPrice.toLocaleString()}</span>
        )}
      </div>
      {savings > 0 && showLabel && (
        <SavingsBadge originalPrice={networkPrice} ourPrice={ourPrice} />
      )}
    </div>
  );
}
