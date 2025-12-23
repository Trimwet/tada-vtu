// AI Insights Engine - Powered by Bytez
// Features: Smart Spending, Transaction Summaries, Price Comparison, Error Humanizer

const BYTEZ_API_KEY = process.env.BYTEZ_API_KEY || "";
const BYTEZ_API_URL = "https://api.bytez.com/v1/chat/completions";
const MODEL = "Qwen/Qwen2.5-0.5B-Instruct";

interface Transaction {
  type: string;
  amount: number;
  network?: string;
  created_at: string;
  description?: string;
}

interface SpendingData {
  totalSpent: number;
  airtimeSpent: number;
  dataSpent: number;
  cableSpent: number;
  electricitySpent: number;
  topNetwork: string;
  transactionCount: number;
  avgTransaction: number;
  dataGB: number;
}

// Generate AI response
async function generateAI(prompt: string, maxTokens = 150): Promise<string> {
  if (!BYTEZ_API_KEY) return "";
  
  try {
    const response = await fetch(BYTEZ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BYTEZ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return "";
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

// ============================================
// 1. SMART SPENDING INSIGHTS
// ============================================
export async function generateSpendingInsight(data: SpendingData): Promise<{
  insight: string;
  tip: string;
  savingsPotential: number;
}> {
  // Calculate actual savings potential based on spending patterns
  let savingsPotential = 0;
  let insight = "";

  // Analyze spending patterns
  const dataPercent = data.totalSpent > 0 ? (data.dataSpent / data.totalSpent) * 100 : 0;
  const airtimePercent = data.totalSpent > 0 ? (data.airtimeSpent / data.totalSpent) * 100 : 0;

  // Calculate savings based on actual spending
  if (data.dataSpent > 3000) {
    // Heavy data user - could save 15-20% with monthly bundles
    savingsPotential = Math.round(data.dataSpent * 0.18);
    insight = `You spent ${formatMoney(data.dataSpent)} on data this month. Switching to monthly SME bundles could save you up to ${formatMoney(savingsPotential)}. ${data.topNetwork} SME plans offer the best rates!`;
  } else if (data.airtimeSpent > 5000) {
    // Heavy airtime user - could save with data-based calling
    savingsPotential = Math.round(data.airtimeSpent * 0.25);
    insight = `High airtime spending detected (${formatMoney(data.airtimeSpent)}). Using WhatsApp or data-based calls could cut your airtime costs by 25%. Consider buying more data instead!`;
  } else if (data.transactionCount > 10 && data.avgTransaction < 500) {
    // Many small transactions - could save with bulk purchases
    savingsPotential = Math.round(data.totalSpent * 0.12);
    insight = `You made ${data.transactionCount} small transactions averaging ${formatMoney(data.avgTransaction)}. Buying in bulk saves money - fewer transactions, better rates!`;
  } else if (dataPercent > 60) {
    // Data-heavy user
    savingsPotential = Math.round(data.dataSpent * 0.15);
    insight = `${Math.round(dataPercent)}% of your spending is on data. You're a power user! Check our Best Deals tab for the cheapest GB rates across all networks.`;
  } else if (airtimePercent > 60) {
    // Airtime-heavy user
    savingsPotential = Math.round(data.airtimeSpent * 0.20);
    insight = `${Math.round(airtimePercent)}% of your spending is airtime. Pro tip: Data bundles for calls (WhatsApp, etc.) are much cheaper than regular airtime!`;
  } else {
    // Balanced user
    savingsPotential = Math.round(data.totalSpent * 0.10);
    insight = `Your spending is well-balanced across services. Keep tracking your usage - you're already spending smart! Consider our loyalty rewards for extra savings.`;
  }

  // Try AI enhancement if available
  if (BYTEZ_API_KEY) {
    const prompt = `You are a Nigerian fintech advisor. Give ONE specific money-saving tip in 2 sentences for this VTU user:
- Total: ₦${data.totalSpent.toLocaleString()}
- Airtime: ₦${data.airtimeSpent.toLocaleString()}
- Data: ₦${data.dataSpent.toLocaleString()} (${data.dataGB}GB)
- Top network: ${data.topNetwork}
- ${data.transactionCount} transactions

Be friendly, use Nigerian context. No greetings.`;

    const aiInsight = await generateAI(prompt, 100);
    if (aiInsight && aiInsight.length > 20) {
      insight = aiInsight;
    }
  }

  return {
    insight,
    tip: extractTip(insight) || "Consider buying monthly data bundles for better value.",
    savingsPotential: Math.max(savingsPotential, 100), // Minimum ₦100 savings shown
  };
}

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

function extractTip(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  return sentences[0]?.trim() || "";
}

// ============================================
// 2. TRANSACTION SUMMARIES
// ============================================
export async function generateTransactionSummary(
  transactions: Transaction[],
  period: "week" | "month",
  spendingData?: SpendingData
): Promise<{
  summary: string;
  highlights: string[];
  recommendation: string;
}> {
  // Use provided spending data or analyze transactions
  const stats = spendingData ? {
    total: spendingData.totalSpent,
    count: spendingData.transactionCount,
    topType: spendingData.dataSpent > spendingData.airtimeSpent ? "data" : "airtime",
    topNetwork: spendingData.topNetwork || "MTN",
    maxAmount: spendingData.avgTransaction * 2,
    dataGB: spendingData.dataGB,
    avgAmount: spendingData.avgTransaction,
  } : analyzeTransactions(transactions);

  // Generate accurate highlights
  const highlights: string[] = [];
  
  if (stats.total > 0) {
    highlights.push(`₦${stats.total.toLocaleString()} spent`);
  }
  if (stats.count > 0) {
    highlights.push(`${stats.count} transactions`);
  }
  if (stats.dataGB > 0) {
    highlights.push(`${stats.dataGB}GB data`);
  }
  if (stats.topNetwork) {
    highlights.push(`${stats.topNetwork} user`);
  }

  // Generate recommendation based on actual data
  let recommendation = "";
  if (stats.dataGB > 10) {
    recommendation = "Heavy data user! Monthly bundles could save you 15-20%.";
  } else if (stats.count > 15) {
    recommendation = "Lots of transactions! Consider bulk purchases for better rates.";
  } else if (stats.total > 10000) {
    recommendation = "Big spender! Check our loyalty rewards for cashback.";
  } else {
    recommendation = "You're spending wisely. Keep tracking for more savings!";
  }

  // Generate summary
  const summary = stats.total > 0
    ? `This ${period}, you made ${stats.count} transactions totaling ₦${stats.total.toLocaleString()}. ${stats.topType === "data" ? `You purchased ${stats.dataGB}GB of data.` : `Most spending was on ${stats.topType}.`}`
    : `No transactions this ${period} yet. Start recharging to see your insights!`;

  return {
    summary,
    highlights: highlights.slice(0, 4), // Max 4 highlights
    recommendation,
  };
}

function analyzeTransactions(transactions: Transaction[]) {
  let total = 0, count = 0, maxAmount = 0, dataGB = 0;
  const types: Record<string, number> = {};
  const networks: Record<string, number> = {};

  transactions.forEach(t => {
    const amount = Math.abs(t.amount);
    total += amount;
    count++;
    if (amount > maxAmount) maxAmount = amount;
    
    types[t.type] = (types[t.type] || 0) + 1;
    if (t.network) networks[t.network] = (networks[t.network] || 0) + 1;
    
    const gbMatch = t.description?.match(/(\d+(?:\.\d+)?)\s*GB/i);
    if (gbMatch) dataGB += parseFloat(gbMatch[1]);
  });

  const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0] || "airtime";
  const topNetwork = Object.entries(networks).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  return { 
    total, 
    count, 
    maxAmount, 
    dataGB: Math.round(dataGB * 10) / 10, 
    topType, 
    topNetwork,
    avgAmount: count > 0 ? Math.round(total / count) : 0,
  };
}

// ============================================
// 3. PRICE COMPARISON - ACCURATE DATA
// ============================================
interface DataPlan {
  network: string;
  size: string;
  sizeGB: number;
  price: number;
  validity: string;
  pricePerGB: number;
}

// Accurate Nigerian data plans (December 2025 prices)
const DATA_PLANS: Omit<DataPlan, 'pricePerGB'>[] = [
  // MTN SME Plans (Best rates)
  { network: "MTN", size: "500MB", sizeGB: 0.5, price: 150, validity: "30 days" },
  { network: "MTN", size: "1GB", sizeGB: 1, price: 280, validity: "30 days" },
  { network: "MTN", size: "2GB", sizeGB: 2, price: 560, validity: "30 days" },
  { network: "MTN", size: "3GB", sizeGB: 3, price: 840, validity: "30 days" },
  { network: "MTN", size: "5GB", sizeGB: 5, price: 1400, validity: "30 days" },
  { network: "MTN", size: "10GB", sizeGB: 10, price: 2800, validity: "30 days" },
  
  // Airtel CG Plans
  { network: "AIRTEL", size: "500MB", sizeGB: 0.5, price: 145, validity: "30 days" },
  { network: "AIRTEL", size: "1GB", sizeGB: 1, price: 290, validity: "30 days" },
  { network: "AIRTEL", size: "2GB", sizeGB: 2, price: 580, validity: "30 days" },
  { network: "AIRTEL", size: "5GB", sizeGB: 5, price: 1450, validity: "30 days" },
  { network: "AIRTEL", size: "10GB", sizeGB: 10, price: 2900, validity: "30 days" },
  
  // Glo Corporate Plans
  { network: "GLO", size: "500MB", sizeGB: 0.5, price: 130, validity: "30 days" },
  { network: "GLO", size: "1GB", sizeGB: 1, price: 260, validity: "30 days" },
  { network: "GLO", size: "2GB", sizeGB: 2, price: 520, validity: "30 days" },
  { network: "GLO", size: "5GB", sizeGB: 5, price: 1300, validity: "30 days" },
  { network: "GLO", size: "10GB", sizeGB: 10, price: 2600, validity: "30 days" },
];

// Get best deal from each network (monthly plans only)
export function getBestDealsAllNetworks(): {
  deals: DataPlan[];
  bestOverall: DataPlan;
  comparison: string;
} {
  const networks = ["MTN", "AIRTEL", "GLO"];
  const deals: DataPlan[] = [];

  networks.forEach(network => {
    // Get monthly plans and calculate price per GB
    const networkPlans = DATA_PLANS
      .filter(p => p.network === network && p.validity.includes("30") && p.sizeGB >= 1)
      .map(p => ({ ...p, pricePerGB: Math.round(p.price / p.sizeGB) }))
      .sort((a, b) => a.pricePerGB - b.pricePerGB);
    
    if (networkPlans.length > 0) {
      // Get the best value plan (lowest price per GB)
      deals.push(networkPlans[0]);
    }
  });

  // Sort by price per GB to find best overall
  deals.sort((a, b) => a.pricePerGB - b.pricePerGB);
  const bestOverall = deals[0];

  // Generate comparison text
  const comparison = `${bestOverall.network} offers the best value at ₦${bestOverall.pricePerGB}/GB. ${
    deals.length > 1 
      ? `Compare: ${deals.slice(1).map(d => `${d.network} (₦${d.pricePerGB}/GB)`).join(", ")}.`
      : ""
  }`;

  return { deals, bestOverall, comparison };
}

export async function comparePrices(
  targetGB: number,
  currentNetwork?: string
): Promise<{
  bestDeal: Omit<DataPlan, 'pricePerGB'>;
  alternatives: Omit<DataPlan, 'pricePerGB'>[];
  aiRecommendation: string;
  savings: number;
}> {
  // Find plans close to target GB
  const relevantPlans = DATA_PLANS
    .filter(p => p.sizeGB >= targetGB * 0.8 && p.sizeGB <= targetGB * 1.5)
    .sort((a, b) => (a.price / a.sizeGB) - (b.price / b.sizeGB));

  const bestDeal = relevantPlans[0] || DATA_PLANS.find(p => p.sizeGB >= 1) || DATA_PLANS[0];
  const alternatives = relevantPlans.slice(1, 4);
  
  // Calculate savings vs worst option
  const worstPrice = relevantPlans.length > 0 
    ? Math.max(...relevantPlans.map(p => p.price / p.sizeGB))
    : bestDeal.price / bestDeal.sizeGB;
  const bestPrice = bestDeal.price / bestDeal.sizeGB;
  const savings = Math.round((worstPrice - bestPrice) * targetGB);

  const aiRecommendation = `${bestDeal.network} ${bestDeal.size} offers the best value at ₦${Math.round(bestDeal.price / bestDeal.sizeGB)}/GB!`;

  return {
    bestDeal,
    alternatives,
    aiRecommendation,
    savings: Math.max(savings, 0),
  };
}

// ============================================
// 4. ERROR MESSAGE HUMANIZER
// ============================================
const ERROR_MAPPINGS: Record<string, string> = {
  "insufficient_balance": "Oops! Your wallet needs a top-up. Fund your wallet to continue.",
  "network_error": "Connection hiccup! Check your internet and try again.",
  "invalid_phone": "That phone number doesn't look right. Double-check and retry!",
  "service_unavailable": "This service is taking a quick break. Try again in a moment!",
  "transaction_failed": "Transaction didn't go through. Your money is safe - try again!",
  "rate_limit": "Whoa, slow down! Too many requests. Wait a bit and retry.",
  "invalid_amount": "That amount won't work. Check the min/max limits and try again.",
  "duplicate_transaction": "Looks like you already did this! Check your transaction history.",
  "timeout": "Taking too long! Your connection might be slow. Try again.",
  "auth_error": "Session expired. Please log in again to continue.",
};

export async function humanizeError(
  errorCode: string,
  errorMessage?: string,
  context?: string
): Promise<{
  friendlyMessage: string;
  suggestion: string;
  emoji: string;
}> {
  const knownError = ERROR_MAPPINGS[errorCode.toLowerCase()];
  if (knownError) {
    return {
      friendlyMessage: knownError,
      suggestion: getSuggestion(errorCode),
      emoji: getErrorEmoji(errorCode),
    };
  }

  return {
    friendlyMessage: errorMessage || "Something went wrong. Please try again or contact support.",
    suggestion: "If this keeps happening, reach out to our support team.",
    emoji: "😅",
  };
}

function getSuggestion(errorCode: string): string {
  const suggestions: Record<string, string> = {
    "insufficient_balance": "Tap 'Fund Wallet' to add money instantly.",
    "network_error": "Move to a spot with better signal.",
    "invalid_phone": "Make sure it's 11 digits starting with 0.",
    "service_unavailable": "We're working on it! Usually back in minutes.",
    "transaction_failed": "Check your balance and try a smaller amount.",
    "rate_limit": "Take a 30-second break, then continue.",
    "invalid_amount": "Check the service page for valid amounts.",
    "duplicate_transaction": "No action needed - it's already done!",
    "timeout": "Try using WiFi for a more stable connection.",
    "auth_error": "Your session is safe - just log back in.",
  };
  return suggestions[errorCode.toLowerCase()] || "Try again or contact support.";
}

function getErrorEmoji(errorCode: string): string {
  const emojis: Record<string, string> = {
    "insufficient_balance": "💰",
    "network_error": "📶",
    "invalid_phone": "📱",
    "service_unavailable": "🔧",
    "transaction_failed": "🔄",
    "rate_limit": "⏳",
    "invalid_amount": "💵",
    "duplicate_transaction": "✅",
    "timeout": "⏰",
    "auth_error": "🔐",
  };
  return emojis[errorCode.toLowerCase()] || "😅";
}

// ============================================
// COMBINED INSIGHTS DASHBOARD
// ============================================
export interface AIInsights {
  spending: {
    insight: string;
    tip: string;
    savingsPotential: number;
  };
  summary: {
    summary: string;
    highlights: string[];
    recommendation: string;
  };
  bestDeals: {
    data: Omit<DataPlan, 'pricePerGB'>;
    savings: number;
  };
}

export async function generateDashboardInsights(
  transactions: Transaction[],
  monthlySpending: SpendingData
): Promise<AIInsights> {
  const [spending, summary, priceComparison] = await Promise.all([
    generateSpendingInsight(monthlySpending),
    generateTransactionSummary(transactions, "month", monthlySpending),
    comparePrices(monthlySpending.dataGB || 5),
  ]);

  return {
    spending,
    summary,
    bestDeals: {
      data: priceComparison.bestDeal,
      savings: priceComparison.savings,
    },
  };
}
