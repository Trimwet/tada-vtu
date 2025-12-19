// TADA VTU Pricing Tier System
// Internal pricing logic - DO NOT expose tier thresholds or discounts to users

export type PricingTier = 'bronze' | 'silver' | 'gold' | 'platinum';

// Internal config - never expose to frontend
interface InternalTierConfig {
  minSpent: number;
  maxSpent: number | null;
  airtimeDiscount: number;
  dataDiscount: number;
}

// INTERNAL ONLY - pricing thresholds and discounts
const INTERNAL_TIERS: Record<PricingTier, InternalTierConfig> = {
  bronze: {
    minSpent: 0,
    maxSpent: 9999,
    airtimeDiscount: 2.0, // Best price to hook new users
    dataDiscount: 2.0,
  },
  silver: {
    minSpent: 10000,
    maxSpent: 49999,
    airtimeDiscount: 1.5,
    dataDiscount: 1.5,
  },
  gold: {
    minSpent: 50000,
    maxSpent: 199999,
    airtimeDiscount: 1.0, // Lowest discount (they're loyal anyway)
    dataDiscount: 1.0,
  },
  platinum: {
    minSpent: 200000,
    maxSpent: null,
    airtimeDiscount: 2.5, // Best reseller prices
    dataDiscount: 2.5,
  },
};

// Public tier display info - safe to show users
export interface TierDisplay {
  name: string;
  icon: string;
  color: string;
}

// Icons use Ionicons names
export const TIER_DISPLAY: Record<PricingTier, TierDisplay> = {
  bronze: { name: 'Bronze', icon: 'shield-outline', color: '#CD7F32' },
  silver: { name: 'Silver', icon: 'shield-half-outline', color: '#C0C0C0' },
  gold: { name: 'Gold', icon: 'shield', color: '#FFD700' },
  platinum: { name: 'Platinum', icon: 'diamond', color: '#E5E4E2' },
};

// Get user's tier based on total spent (INTERNAL)
export function getUserTier(totalSpent: number): PricingTier {
  if (totalSpent >= 200000) return 'platinum';
  if (totalSpent >= 50000) return 'gold';
  if (totalSpent >= 10000) return 'silver';
  return 'bronze';
}

// Get tier display info (safe for frontend)
export function getTierDisplay(tier: PricingTier): TierDisplay {
  return TIER_DISPLAY[tier];
}

// Calculate discounted airtime price (INTERNAL - don't expose discount %)
export function calculateAirtimePrice(
  faceValue: number,
  tier: PricingTier
): number {
  const config = INTERNAL_TIERS[tier];
  const savings = Math.floor(faceValue * (config.airtimeDiscount / 100));
  return faceValue - savings;
}

// Calculate discounted data price (INTERNAL)
export function calculateDataPrice(
  basePrice: number,
  tier: PricingTier
): number {
  const config = INTERNAL_TIERS[tier];
  const savings = Math.floor(basePrice * (config.dataDiscount / 100));
  return basePrice - savings;
}

// Get discount percentage (INTERNAL - for API calculations only)
export function getAirtimeDiscount(tier: PricingTier): number {
  return INTERNAL_TIERS[tier].airtimeDiscount;
}

export function getDataDiscount(tier: PricingTier): number {
  return INTERNAL_TIERS[tier].dataDiscount;
}

/*
 * INTERNAL PRICING REFERENCE (DO NOT EXPOSE TO USERS)
 * ════════════════════════════════════════════════════
 * 
 * 🥉 BRONZE (₦0 - ₦9,999 spent) - 2% discount
 *    New users get best prices to hook them
 * 
 * 🥈 SILVER (₦10,000 - ₦49,999 spent) - 1.5% discount
 *    Regular users, slightly reduced
 * 
 * 🥇 GOLD (₦50,000 - ₦199,999 spent) - 1% discount
 *    Loyal users, lowest discount (they won't leave)
 * 
 * 💎 PLATINUM (₦200,000+ spent) - 2.5% discount
 *    Resellers get best prices to keep volume high
 * 
 * EXAMPLE: ₦1,000 Airtime
 * Bronze:   ₦980 (saves ₦20)
 * Silver:   ₦985 (saves ₦15)
 * Gold:     ₦990 (saves ₦10)
 * Platinum: ₦975 (saves ₦25)
 */
