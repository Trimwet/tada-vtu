// Loyalty System Configuration and Utilities

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export interface TierConfig {
  name: string;
  minPoints: number;
  color: string;
  bgColor: string;
  pointsMultiplier: number;
  benefits: string[];
}

export const TIER_CONFIG: Record<LoyaltyTier, TierConfig> = {
  bronze: {
    name: "Bronze",
    minPoints: 0,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    pointsMultiplier: 1,
    benefits: ["1 point per ₦100 spent", "Daily spin wheel"],
  },
  silver: {
    name: "Silver",
    minPoints: 1000,
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
    pointsMultiplier: 1.25,
    benefits: ["1.25x points", "Priority support", "5% bonus on referrals"],
  },
  gold: {
    name: "Gold",
    minPoints: 5000,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    pointsMultiplier: 1.5,
    benefits: ["1.5x points", "Exclusive deals", "10% bonus on referrals"],
  },
  platinum: {
    name: "Platinum",
    minPoints: 10000,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    pointsMultiplier: 2,
    benefits: [
      "2x points",
      "VIP support",
      "15% bonus on referrals",
      "Early access",
    ],
  },
};

// Calculate points earned from a transaction
export function calculatePoints(amount: number, tier: LoyaltyTier): number {
  const basePoints = Math.floor(amount / 100); // 1 point per ₦100
  const multiplier = TIER_CONFIG[tier].pointsMultiplier;
  return Math.floor(basePoints * multiplier);
}

// Get tier from total points
export function getTierFromPoints(totalPoints: number): LoyaltyTier {
  if (totalPoints >= 10000) return "platinum";
  if (totalPoints >= 5000) return "gold";
  if (totalPoints >= 1000) return "silver";
  return "bronze";
}

// Get progress to next tier
export function getTierProgress(totalPoints: number): {
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  progress: number;
  pointsToNext: number;
} {
  const currentTier = getTierFromPoints(totalPoints);
  const tiers: LoyaltyTier[] = ["bronze", "silver", "gold", "platinum"];
  const currentIndex = tiers.indexOf(currentTier);

  if (currentIndex === tiers.length - 1) {
    return { currentTier, nextTier: null, progress: 100, pointsToNext: 0 };
  }

  const nextTier = tiers[currentIndex + 1];
  const currentMin = TIER_CONFIG[currentTier].minPoints;
  const nextMin = TIER_CONFIG[nextTier].minPoints;
  const progress = ((totalPoints - currentMin) / (nextMin - currentMin)) * 100;
  const pointsToNext = nextMin - totalPoints;

  return {
    currentTier,
    nextTier,
    progress: Math.min(progress, 100),
    pointsToNext,
  };
}

// Spin wheel prizes
export interface SpinPrize {
  id: string;
  type: "points" | "discount" | "cashback" | "nothing";
  value: number;
  label: string;
  color: string;
  probability: number; // 0-100
}

export const SPIN_PRIZES: SpinPrize[] = [
  {
    id: "1",
    type: "points",
    value: 10,
    label: "10 Points",
    color: "#22c55e",
    probability: 25,
  },
  {
    id: "2",
    type: "points",
    value: 25,
    label: "25 Points",
    color: "#3b82f6",
    probability: 20,
  },
  {
    id: "3",
    type: "points",
    value: 50,
    label: "50 Points",
    color: "#8b5cf6",
    probability: 10,
  },
  {
    id: "4",
    type: "discount",
    value: 5,
    label: "5% Off",
    color: "#f59e0b",
    probability: 15,
  },
  {
    id: "5",
    type: "discount",
    value: 10,
    label: "10% Off",
    color: "#ef4444",
    probability: 5,
  },
  {
    id: "6",
    type: "cashback",
    value: 2,
    label: "2% Cashback",
    color: "#06b6d4",
    probability: 10,
  },
  {
    id: "7",
    type: "nothing",
    value: 0,
    label: "Try Again",
    color: "#6b7280",
    probability: 15,
  },
];

// Get random prize based on probability
export function getRandomPrize(): SpinPrize {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const prize of SPIN_PRIZES) {
    cumulative += prize.probability;
    if (random <= cumulative) {
      return prize;
    }
  }

  return SPIN_PRIZES[SPIN_PRIZES.length - 1];
}

// Redemption options
export interface RedemptionOption {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  value: number; // Naira value
  type: "airtime" | "data" | "discount";
}

export const REDEMPTION_OPTIONS: RedemptionOption[] = [
  {
    id: "airtime_100",
    name: "₦100 Airtime",
    description: "Any network",
    pointsCost: 150,
    value: 100,
    type: "airtime",
  },
  {
    id: "airtime_200",
    name: "₦200 Airtime",
    description: "Any network",
    pointsCost: 280,
    value: 200,
    type: "airtime",
  },
  {
    id: "airtime_500",
    name: "₦500 Airtime",
    description: "Any network",
    pointsCost: 650,
    value: 500,
    type: "airtime",
  },
  {
    id: "data_500mb",
    name: "500MB Data",
    description: "Any network",
    pointsCost: 400,
    value: 300,
    type: "data",
  },
  {
    id: "data_1gb",
    name: "1GB Data",
    description: "Any network",
    pointsCost: 700,
    value: 500,
    type: "data",
  },
  {
    id: "discount_10",
    name: "10% Discount",
    description: "Next purchase",
    pointsCost: 200,
    value: 10,
    type: "discount",
  },
];

// Achievement definitions
export interface Achievement {
  code: string;
  name: string;
  description: string;
  pointsReward: number;
  requirementType: "transactions" | "streak" | "referrals" | "spending";
  requirementValue: number;
  tier: LoyaltyTier;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    code: "first_purchase",
    name: "First Steps",
    description: "Complete your first transaction",
    pointsReward: 50,
    requirementType: "transactions",
    requirementValue: 1,
    tier: "bronze",
  },
  {
    code: "streak_7",
    name: "Week Warrior",
    description: "Login for 7 consecutive days",
    pointsReward: 100,
    requirementType: "streak",
    requirementValue: 7,
    tier: "bronze",
  },
  {
    code: "streak_30",
    name: "Monthly Master",
    description: "Login for 30 consecutive days",
    pointsReward: 500,
    requirementType: "streak",
    requirementValue: 30,
    tier: "silver",
  },
  {
    code: "transactions_10",
    name: "Regular Customer",
    description: "Complete 10 transactions",
    pointsReward: 200,
    requirementType: "transactions",
    requirementValue: 10,
    tier: "bronze",
  },
  {
    code: "transactions_50",
    name: "Power User",
    description: "Complete 50 transactions",
    pointsReward: 500,
    requirementType: "transactions",
    requirementValue: 50,
    tier: "silver",
  },
  {
    code: "transactions_100",
    name: "VIP Customer",
    description: "Complete 100 transactions",
    pointsReward: 1000,
    requirementType: "transactions",
    requirementValue: 100,
    tier: "gold",
  },
];

// Favorite amounts
export const FAVORITE_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
