// TADA VTU Pricing Configuration
// This file contains the cost prices (what you pay to Inlomax) and selling prices (what users pay)

/**
 * PRICING STRATEGY:
 * 
 * 1. AIRTIME: 2% discount from Inlomax, sell at face value = 2% profit
 *    Example: User buys ₦1000 airtime, you pay ₦980, profit = ₦20
 * 
 * 2. DATA: Add ₦10-50 markup depending on plan size
 *    Small plans (< 1GB): +₦10
 *    Medium plans (1-5GB): +₦20
 *    Large plans (> 5GB): +₦30-50
 * 
 * 3. CABLE TV: Add ₦50-100 service fee
 * 
 * 4. ELECTRICITY: Add ₦50 service fee
 * 
 * 5. BETTING: Add ₦20-50 service fee
 * 
 * 6. WALLET FUNDING: Flutterwave charges ~1.4% + ₦100 cap
 *    You can absorb this or pass to user (currently absorbed)
 */

// Airtime discount from Inlomax (you get 2% discount)
export const AIRTIME_DISCOUNT = 0.02; // 2%

// Service fees and discounts
export const SERVICE_FEES = {
  // Electricity: You get ~2% discount from provider, user pays face value
  // Example: User buys ₦5000, you pay ₦4900, profit = ₦100
  electricity: {
    discount: 0.02, // 2% discount from provider
  },
  cable: {
    small: 50,      // Plans under ₦5000
    medium: 75,     // Plans ₦5000-₦15000
    large: 100,     // Plans over ₦15000
  },
  betting: {
    small: 20,      // Under ₦5000
    medium: 30,     // ₦5000-₦20000
    large: 50,      // Over ₦20000
  },
};

// Data plan markups (added to cost price)
export const DATA_MARKUPS = {
  sme: {
    small: 10,      // Plans under ₦500
    medium: 15,     // Plans ₦500-₦1500
    large: 20,      // Plans over ₦1500
  },
  gifting: {
    small: 15,
    medium: 20,
    large: 30,
  },
  corporate: {
    small: 20,
    medium: 30,
    large: 50,
  },
};

// Calculate data markup based on cost price and type
export function getDataMarkup(costPrice: number, type: string): number {
  const markups = DATA_MARKUPS[type as keyof typeof DATA_MARKUPS] || DATA_MARKUPS.sme;
  
  if (costPrice < 500) return markups.small;
  if (costPrice <= 1500) return markups.medium;
  return markups.large;
}

// Calculate cable fee based on plan price
export function getCableFee(planPrice: number): number {
  if (planPrice < 5000) return SERVICE_FEES.cable.small;
  if (planPrice <= 15000) return SERVICE_FEES.cable.medium;
  return SERVICE_FEES.cable.large;
}

// Calculate betting fee based on amount
export function getBettingFee(amount: number): number {
  if (amount < 5000) return SERVICE_FEES.betting.small;
  if (amount <= 20000) return SERVICE_FEES.betting.medium;
  return SERVICE_FEES.betting.large;
}

// Calculate airtime profit (you get 2% discount from provider)
export function getAirtimeProfit(amount: number): number {
  return Math.floor(amount * AIRTIME_DISCOUNT);
}

/**
 * COST PRICES (What you pay to Inlomax)
 * These are approximate - actual prices may vary
 * Update these based on your Inlomax dashboard
 */
export const DATA_COST_PRICES = {
  MTN: {
    sme: {
      '500MB': 140,
      '1GB': 265,
      '2GB': 530,
      '3GB': 795,
      '5GB': 1325,
      '10GB': 2650,
    },
    gifting: {
      '500MB': 165,
      '1GB': 330,
      '2GB': 660,
      '5GB': 1650,
    },
    corporate: {
      '5GB': 1500,
      '10GB': 2800,
      '20GB': 5200,
    },
  },
  Airtel: {
    sme: {
      '500MB': 135,
      '1GB': 260,
      '2GB': 520,
      '5GB': 1300,
    },
    gifting: {
      '1GB': 280,
      '2GB': 560,
      '5GB': 1400,
      '10GB': 2600,
    },
    corporate: {
      '10GB': 2700,
      '25GB': 6100,
    },
  },
  Glo: {
    sme: {
      '1GB': 255,
      '2GB': 510,
      '3GB': 765,
      '5GB': 1275,
    },
    gifting: {
      '1.5GB': 375,
      '3GB': 850,
      '7GB': 1800,
      '10GB': 2550,
    },
  },
  '9mobile': {
    sme: {
      '500MB': 130,
      '1GB': 265,
      '2GB': 530,
    },
    gifting: {
      '1.5GB': 395,
      '2GB': 530,
      '4.5GB': 1190,
      '11GB': 2900,
    },
  },
};

/**
 * PROFIT SUMMARY (Estimated per transaction):
 * 
 * Airtime ₦1000: Profit = ₦20 (2%)
 * Data 1GB SME: Profit = ₦15-20
 * Data 5GB: Profit = ₦50-75
 * Cable DSTV Compact: Profit = ₦75
 * Electricity ₦5000: Profit = ₦50
 * Betting ₦10000: Profit = ₦30
 * 
 * Average profit per transaction: ₦30-50
 * 
 * If you process 100 transactions/day:
 * Daily profit: ₦3,000 - ₦5,000
 * Monthly profit: ₦90,000 - ₦150,000
 */
