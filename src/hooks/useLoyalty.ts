"use client";

import { useState, useEffect, useCallback } from "react";
import { type LoyaltyTier, type SpinPrize } from "@/lib/loyalty";

interface LoyaltyData {
  loyalty_points: number;
  loyalty_tier: LoyaltyTier;
  total_points_earned: number;
  login_streak: number;
  longest_streak: number;
  spin_available: boolean;
  last_spin_date: string | null;
  birthday: string | null;
  transactions: Array<{
    id: string;
    points: number;
    type: string;
    source: string;
    description: string;
    created_at: string;
  }>;
  achievements: Array<{
    id: string;
    achievement_id: string;
    unlocked_at: string;
    achievements: {
      code: string;
      name: string;
      description: string;
      icon: string;
      points_reward: number;
    };
  }>;
}

export function useLoyalty() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoyaltyData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/loyalty");
      
      if (!response.ok) {
        throw new Error("Failed to fetch loyalty data");
      }
      
      const loyaltyData = await response.json();
      setData(loyaltyData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const processDailyLogin = useCallback(async () => {
    try {
      const response = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "daily_login" }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to process daily login");
      }
      
      const result = await response.json();
      await fetchLoyaltyData();
      return result.data;
    } catch (err) {
      console.error("Daily login error:", err);
      throw err;
    }
  }, [fetchLoyaltyData]);

  const spinWheel = useCallback(async (): Promise<SpinPrize> => {
    try {
      const response = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spin" }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to spin wheel");
      }
      
      const result = await response.json();
      await fetchLoyaltyData();
      return result.prize;
    } catch (err) {
      console.error("Spin wheel error:", err);
      throw err;
    }
  }, [fetchLoyaltyData]);

  const redeemReward = useCallback(async (optionId: string, pointsCost: number, rewardType: string, rewardValue: number) => {
    try {
      const response = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "redeem", 
          optionId, 
          pointsCost, 
          rewardType, 
          rewardValue 
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to redeem reward");
      }
      
      await fetchLoyaltyData();
      return true;
    } catch (err) {
      console.error("Redeem reward error:", err);
      throw err;
    }
  }, [fetchLoyaltyData]);

  useEffect(() => {
    fetchLoyaltyData();
  }, [fetchLoyaltyData]);

  return {
    data,
    loading,
    error,
    refetch: fetchLoyaltyData,
    processDailyLogin,
    spinWheel,
    redeemReward,
  };
}
