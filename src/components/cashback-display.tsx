"use client";

import { IonIcon } from "@/components/ion-icon";
import { getCashbackLevel, LEVEL_CONFIG, type CashbackLevel } from "@/lib/cashback";

interface CashbackDisplayProps {
  totalEarned: number;
  className?: string;
}

export function CashbackDisplay({ totalEarned, className = "" }: CashbackDisplayProps) {
  const { level, nextLevel, progress, bonus } = getCashbackLevel(totalEarned);
  const config = LEVEL_CONFIG[level];
  const nextConfig = nextLevel ? LEVEL_CONFIG[nextLevel] : null;

  return (
    <div className={`bg-gradient-to-br from-card to-muted/30 border border-border rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${config.color}`}>
            <IonIcon name={config.icon} size="24px" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cashback Level</p>
            <p className={`font-bold ${config.color}`}>{config.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Earned</p>
          <p className="font-bold text-green-500">₦{totalEarned.toLocaleString()}</p>
        </div>
      </div>

      {nextLevel && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress to {nextConfig?.label}</span>
            <span className="text-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {bonus > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-500">
          <IonIcon name="star" size="14px" />
          <span>+{bonus}% bonus cashback on all transactions</span>
        </div>
      )}
    </div>
  );
}

// Mini cashback badge for transaction preview
interface CashbackPreviewProps {
  amount: number;
  percentage: number;
}

export function CashbackPreview({ amount, percentage }: CashbackPreviewProps) {
  if (amount <= 0) return null;

  return (
    <div className="flex items-center gap-1 text-amber-500 text-sm">
      <IonIcon name="gift" size="14px" />
      <span>+₦{amount} cashback ({percentage}%)</span>
    </div>
  );
}

// Cashback earned animation
interface CashbackEarnedProps {
  amount: number;
  onComplete?: () => void;
}

export function CashbackEarned({ amount, onComplete }: CashbackEarnedProps) {
  if (amount <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 text-center animate-in zoom-in-95">
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <IonIcon name="gift" size="40px" className="text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Cashback Earned!</h3>
        <p className="text-3xl font-bold text-amber-500 mb-4">+₦{amount.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground mb-4">
          Added to your wallet balance
        </p>
        <button
          onClick={onComplete}
          className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}
