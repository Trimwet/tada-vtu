// Smart Price Optimizer - AI-powered savings recommendations
import type { SmartRecommendation, UserSpendingPattern, NetworkPrice } from '@/types/database';

// Tier-based birthday bonuses
export const BIRTHDAY_BONUSES: Record<string, number> = {
  bronze: 50,
  silver: 200,
  gold: 500,
  platinum: 1000,
};

// Network comparison data (simplified - in production, fetch from network_prices table)
export interface PlanComparison {
  network: string;
  planName: string;
  dataGB: number;
  price: number;
  pricePerGB: number;
  validity: number;
  isPromo: boolean;
}

// Analyze user spending and generate recommendations
export async function analyzeSpendingPatterns(
  patterns: UserSpendingPattern[]
): Promise<{
  avgMonthlySpend: number;
  avgDataSpend: number;
  avgAirtimeSpend: number;
  preferredNetwork: string | null;
  spendingTrend: 'increasing' | 'decreasing' | 'stable';
  peakSpendingDay: number;
}> {
  if (patterns.length === 0) {
    return {
      avgMonthlySpend: 0,
      avgDataSpend: 0,
      avgAirtimeSpend: 0,
      preferredNetwork: null,
      spendingTrend: 'stable',
      peakSpendingDay: 1,
    };
  }

  const totalSpend = patterns.reduce(
    (sum, p) => sum + p.airtime_spent + p.data_spent + p.cable_spent + p.electricity_spent,
    0
  );
  const totalData = patterns.reduce((sum, p) => sum + p.data_spent, 0);
  const totalAirtime = patterns.reduce((sum, p) => sum + p.airtime_spent, 0);

  // Find most common network
  const networkCounts: Record<string, number> = {};
  patterns.forEach((p) => {
    if (p.preferred_network) {
      networkCounts[p.preferred_network] = (networkCounts[p.preferred_network] || 0) + 1;
    }
  });
  const preferredNetwork = Object.entries(networkCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Calculate trend (compare first half vs second half)
  const midpoint = Math.floor(patterns.length / 2);
  const firstHalf = patterns.slice(0, midpoint);
  const secondHalf = patterns.slice(midpoint);

  const firstHalfAvg =
    firstHalf.reduce((sum, p) => sum + p.airtime_spent + p.data_spent, 0) / (firstHalf.length || 1);
  const secondHalfAvg =
    secondHalf.reduce((sum, p) => sum + p.airtime_spent + p.data_spent, 0) / (secondHalf.length || 1);

  let spendingTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (secondHalfAvg > firstHalfAvg * 1.1) spendingTrend = 'increasing';
  else if (secondHalfAvg < firstHalfAvg * 0.9) spendingTrend = 'decreasing';

  // Find peak spending day
  const daySpending: Record<number, number> = {};
  patterns.forEach((p) => {
    const day = new Date(p.period_date).getDate();
    daySpending[day] = (daySpending[day] || 0) + p.airtime_spent + p.data_spent;
  });
  const peakSpendingDay = Object.entries(daySpending).sort((a, b) => b[1] - a[1])[0]?.[0] || '1';

  return {
    avgMonthlySpend: totalSpend / Math.max(patterns.length / 30, 1),
    avgDataSpend: totalData / Math.max(patterns.length / 30, 1),
    avgAirtimeSpend: totalAirtime / Math.max(patterns.length / 30, 1),
    preferredNetwork,
    spendingTrend,
    peakSpendingDay: parseInt(peakSpendingDay),
  };
}

// Generate AI-powered recommendation using Groq
export async function generateSmartRecommendation(
  userId: string,
  spendingAnalysis: Awaited<ReturnType<typeof analyzeSpendingPatterns>>,
  availablePlans: NetworkPrice[]
): Promise<Omit<SmartRecommendation, 'id' | 'user_id' | 'created_at'>> {
  // Find best value plan based on user's spending
  const userMonthlyDataBudget = spendingAnalysis.avgDataSpend;

  // Filter plans within budget and sort by value (data per naira)
  const affordablePlans = availablePlans
    .filter((p) => p.our_price <= userMonthlyDataBudget * 1.2 && p.data_amount_mb)
    .map((p) => ({
      ...p,
      valueScore: (p.data_amount_mb || 0) / p.our_price,
    }))
    .sort((a, b) => b.valueScore - a.valueScore);

  const bestPlan = affordablePlans[0];
  const currentNetwork = spendingAnalysis.preferredNetwork;

  // Calculate potential savings
  let potentialSavings = 0;
  let savingsPercentage = 0;

  if (bestPlan && currentNetwork && bestPlan.network !== currentNetwork) {
    // Find current network's equivalent plan
    const currentPlan = availablePlans.find(
      (p) =>
        p.network === currentNetwork &&
        p.data_amount_mb &&
        Math.abs((p.data_amount_mb || 0) - (bestPlan.data_amount_mb || 0)) < 500
    );

    if (currentPlan) {
      potentialSavings = currentPlan.our_price - bestPlan.our_price;
      savingsPercentage = (potentialSavings / currentPlan.our_price) * 100;
    }
  }

  // Generate recommendation based on analysis
  if (bestPlan && potentialSavings > 50) {
    return {
      recommendation_type: 'plan_switch',
      title: `Switch to ${bestPlan.network} and save ₦${potentialSavings.toFixed(0)}/month`,
      description: `Based on your usage of ~${(spendingAnalysis.avgDataSpend / 250).toFixed(1)}GB/month, ${bestPlan.plan_name} offers better value than your current ${currentNetwork} plan.`,
      suggested_network: bestPlan.network,
      suggested_plan: bestPlan.plan_name,
      suggested_amount: bestPlan.our_price,
      potential_savings: potentialSavings,
      savings_percentage: savingsPercentage,
      confidence_score: Math.min(85, 60 + potentialSavings / 10),
      reasoning: `You typically spend ₦${spendingAnalysis.avgDataSpend.toFixed(0)} on data monthly. ${bestPlan.network}'s ${bestPlan.plan_name} gives you ${((bestPlan.data_amount_mb || 0) / 1024).toFixed(1)}GB for ₦${bestPlan.our_price}, which is ${savingsPercentage.toFixed(0)}% cheaper than equivalent plans.`,
      status: 'pending',
      accepted_at: null,
      dismissed_at: null,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Timing recommendation if no plan switch available
  if (spendingAnalysis.spendingTrend === 'increasing') {
    return {
      recommendation_type: 'savings_tip',
      title: 'Your data spending is increasing',
      description: `You've been spending ${((spendingAnalysis.avgDataSpend / spendingAnalysis.avgMonthlySpend) * 100).toFixed(0)}% more on data recently. Consider setting a monthly budget.`,
      suggested_network: null,
      suggested_plan: null,
      suggested_amount: spendingAnalysis.avgDataSpend * 0.9,
      potential_savings: spendingAnalysis.avgDataSpend * 0.1,
      savings_percentage: 10,
      confidence_score: 70,
      reasoning: 'Setting spending limits helps control costs without sacrificing connectivity.',
      status: 'pending',
      accepted_at: null,
      dismissed_at: null,
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Default bundle recommendation
  return {
    recommendation_type: 'bundle',
    title: 'Bundle your purchases for savings',
    description: `You make about ${Math.round(spendingAnalysis.avgMonthlySpend / 500)} purchases per month. Buying larger bundles less frequently saves money.`,
    suggested_network: spendingAnalysis.preferredNetwork,
    suggested_plan: null,
    suggested_amount: null,
    potential_savings: spendingAnalysis.avgMonthlySpend * 0.05,
    savings_percentage: 5,
    confidence_score: 65,
    reasoning: 'Larger data bundles typically offer better per-GB pricing.',
    status: 'pending',
    accepted_at: null,
    dismissed_at: null,
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Format savings for display
export function formatSavings(amount: number): string {
  if (amount >= 1000) {
    return `₦${(amount / 1000).toFixed(1)}k`;
  }
  return `₦${amount.toFixed(0)}`;
}

// Calculate user's savings score (0-100)
export function calculateSavingsScore(
  actualSpend: number,
  optimalSpend: number,
  recommendationsAccepted: number,
  totalRecommendations: number
): number {
  const spendEfficiency = optimalSpend > 0 ? Math.min(100, (optimalSpend / actualSpend) * 100) : 50;
  const acceptanceRate = totalRecommendations > 0 ? (recommendationsAccepted / totalRecommendations) * 100 : 50;

  return Math.round(spendEfficiency * 0.7 + acceptanceRate * 0.3);
}
