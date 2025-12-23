"use client";

import { useState, useCallback } from "react";

interface SpendingInsight {
  insight: string;
  tip: string;
  savingsPotential: number;
}

interface TransactionSummary {
  summary: string;
  highlights: string[];
  recommendation: string;
}

interface DataPlan {
  network: string;
  size: string;
  sizeGB: number;
  price: number;
  validity: string;
}

interface PriceComparison {
  bestDeal: DataPlan;
  alternatives: DataPlan[];
  aiRecommendation: string;
  savings: number;
}

interface HumanizedError {
  friendlyMessage: string;
  suggestion: string;
  emoji: string;
}

export function useAIInsights() {
  const [loading, setLoading] = useState(false);

  const fetchInsight = useCallback(async <T>(type: string, data: Record<string, unknown>): Promise<T | null> => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return await response.json();
    } catch (error) {
      console.error("AI Insights error:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSpendingInsight = useCallback(
    (spendingData: {
      totalSpent: number;
      airtimeSpent: number;
      dataSpent: number;
      cableSpent: number;
      electricitySpent: number;
      topNetwork: string;
      transactionCount: number;
      avgTransaction: number;
      dataGB: number;
    }) => fetchInsight<SpendingInsight>("spending-insight", spendingData),
    [fetchInsight]
  );

  const getTransactionSummary = useCallback(
    (period: "week" | "month" = "month") =>
      fetchInsight<TransactionSummary>("transaction-summary", { period }),
    [fetchInsight]
  );

  const comparePrices = useCallback(
    (targetGB: number, currentNetwork?: string) =>
      fetchInsight<PriceComparison>("price-comparison", { targetGB, currentNetwork }),
    [fetchInsight]
  );

  const humanizeError = useCallback(
    (errorCode: string, errorMessage?: string, context?: string) =>
      fetchInsight<HumanizedError>("humanize-error", { errorCode, errorMessage, context }),
    [fetchInsight]
  );

  return {
    loading,
    getSpendingInsight,
    getTransactionSummary,
    comparePrices,
    humanizeError,
  };
}

// Standalone function for error humanization (can be used in toast)
export async function getHumanizedError(
  errorCode: string,
  errorMessage?: string,
  context?: string
): Promise<HumanizedError> {
  try {
    const response = await fetch("/api/ai-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "humanize-error",
        data: { errorCode, errorMessage, context },
      }),
    });
    if (!response.ok) throw new Error("Failed");
    return await response.json();
  } catch {
    return {
      friendlyMessage: "Something went wrong. Please try again.",
      suggestion: "Contact support if this continues.",
      emoji: "😅",
    };
  }
}
