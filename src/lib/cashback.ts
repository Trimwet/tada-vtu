// Cashback calculation system

export interface CashbackTier {
  minAmount: number;
  maxAmount: number;
  percentage: number;
}

// Cashback tiers based on transaction amount
const CASHBACK_TIERS: CashbackTier[] = [
  { minAmount: 100, maxAmount: 499, percentage: 0.5 },
  { minAmount: 500, maxAmount: 999, percentage: 1 },
  { minAmount: 1000, maxAmount: 4999, percentage: 1.5 },
  { minAmount: 5000, maxAmount: 9999, percentage: 2 },
  { minAmount: 10000, maxAmount: 50000, percentage: 2.5 },
];

// Service-specific cashback multipliers
const SERVICE_MULTIPLIERS: Record<string, number> = {
  airtime: 1,
  data: 1.2,      // 20% more cashback on data
  cable: 1.5,     // 50% more cashback on cable
  electricity: 1.5,
  betting: 0.5,   // 50% less cashback on betting
};

// Calculate cashback for a transaction
export function calculateCashback(
  amount: number,
  serviceType: string,
  isFirstTransaction: boolean = false
): { cashback: number; percentage: number } {
  // Find applicable tier
  const tier = CASHBACK_TIERS.find(
    (t) => amount >= t.minAmount && amount <= t.maxAmount
  );

  if (!tier) {
    return { cashback: 0, percentage: 0 };
  }

  // Get service multiplier
  const multiplier = SERVICE_MULTIPLIERS[serviceType] || 1;

  // Calculate base percentage
  let percentage = tier.percentage * multiplier;

  // First transaction bonus (double cashback)
  if (isFirstTransaction) {
    percentage *= 2;
  }

  // Calculate cashback amount
  const cashback = Math.round((amount * percentage) / 100);

  // Cap cashback at ₦500 per transaction
  const cappedCashback = Math.min(cashback, 500);

  return {
    cashback: cappedCashback,
    percentage: Math.round(percentage * 10) / 10,
  };
}

// Get cashback preview for display
export function getCashbackPreview(amount: number, serviceType: string): string {
  const { cashback, percentage } = calculateCashback(amount, serviceType);
  
  if (cashback <= 0) return "";
  
  return `+₦${cashback} cashback (${percentage}%)`;
}

// Calculate total cashback earned
export function calculateTotalCashback(
  transactions: Array<{ amount: number; type: string }>
): number {
  return transactions.reduce((total, tx) => {
    const { cashback } = calculateCashback(Math.abs(tx.amount), tx.type);
    return total + cashback;
  }, 0);
}

// Cashback status levels
export type CashbackLevel = "bronze" | "silver" | "gold" | "platinum";

export function getCashbackLevel(totalEarned: number): {
  level: CashbackLevel;
  nextLevel: CashbackLevel | null;
  progress: number;
  bonus: number;
} {
  if (totalEarned >= 50000) {
    return { level: "platinum", nextLevel: null, progress: 100, bonus: 50 };
  }
  if (totalEarned >= 20000) {
    return {
      level: "gold",
      nextLevel: "platinum",
      progress: ((totalEarned - 20000) / 30000) * 100,
      bonus: 30,
    };
  }
  if (totalEarned >= 5000) {
    return {
      level: "silver",
      nextLevel: "gold",
      progress: ((totalEarned - 5000) / 15000) * 100,
      bonus: 15,
    };
  }
  return {
    level: "bronze",
    nextLevel: "silver",
    progress: (totalEarned / 5000) * 100,
    bonus: 0,
  };
}

// Level colors and icons
export const LEVEL_CONFIG: Record<
  CashbackLevel,
  { color: string; icon: string; label: string }
> = {
  bronze: { color: "text-amber-700", icon: "medal-outline", label: "Bronze" },
  silver: { color: "text-gray-400", icon: "medal", label: "Silver" },
  gold: { color: "text-yellow-500", icon: "trophy", label: "Gold" },
  platinum: { color: "text-purple-500", icon: "diamond", label: "Platinum" },
};
