"use client";

import { useMemo, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Profile, Transaction } from "@/types/database";
import useSWR, { useSWRConfig } from "swr";
import { supabaseFetcher } from "@/lib/swr-fetcher";
import { useAuth } from "./useAuth";

export function useSupabaseUser() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { mutate } = useSWRConfig();
  const supabase = getSupabase();

  // Helper to refresh transactions across the app
  const refreshTransactions = useCallback((limit = 10) => {
    if (!user?.id) return;
    mutate(["transactions", {
      select: "id, type, amount, status, reference, description, created_at, phone_number, network",
      eq: { user_id: user.id },
      order: { column: "created_at", ascending: false },
      limit
    }]);
  }, [user?.id, mutate]);

  const creditWallet = useCallback(
    async (amount: number, reference: string, description: string) => {
      if (!user) throw new Error("User not authenticated");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("update_user_balance", {
        p_user_id: user.id,
        p_amount: amount,
        p_type: "credit",
        p_description: description,
        p_reference: reference,
      });

      if (error) throw error;

      await refreshProfile();
      refreshTransactions();

      return { success: true };
    },
    [user, supabase, refreshProfile, refreshTransactions]
  );

  const debitWallet = useCallback(
    async (
      amount: number,
      type: Transaction["type"],
      description: string,
      phoneNumber?: string,
      network?: string
    ) => {
      if (!user) throw new Error("User not authenticated");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("update_user_balance", {
        p_user_id: user.id,
        p_amount: amount,
        p_type: "debit",
        p_description: description,
      });

      if (error) {
        if (error.message?.includes("Insufficient balance")) {
          return null;
        }
        throw error;
      }

      const { data, error: txnError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type,
          amount: -amount,
          status: "success",
          reference: "REF" + Date.now(),
          description,
          phone_number: phoneNumber,
          network,
        } as never)
        .select()
        .single();

      if (txnError) throw txnError;

      await refreshProfile();
      refreshTransactions();

      return data;
    },
    [user, supabase, refreshProfile, refreshTransactions]
  );

  // Create fallback profile
  const fallbackProfile: Profile | null = useMemo(() => user
    ? {
      id: user.id,
      email: user.email || null,
      full_name: user.user_metadata?.full_name || null,
      phone_number: null,
      balance: 0,
      referral_code: null,
      referred_by: null,
      pin: null,
      kyc_level: 0,
      is_active: true,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      loyalty_points: 0,
      loyalty_tier: "bronze",
      total_points_earned: 0,
      login_streak: 0,
      longest_streak: 0,
      last_login_date: null,
      spin_available: true,
      last_spin_date: null,
      birthday: null,
      total_spent: 0,
    }
    : null, [user]);

  const memoizedUser = useMemo(() => profile || fallbackProfile, [profile, fallbackProfile]);

  return {
    user: memoizedUser,
    loading: authLoading,
    isProfileLoaded: !!profile,
    creditWallet,
    debitWallet,
    refreshUser: refreshProfile,
  };
}

export function useSupabaseTransactions(limit = 10) {
  const { user } = useSupabaseUser();

  const swrKey = user?.id
    ? ["transactions", {
      select: "id, type, amount, status, reference, description, created_at, phone_number, network",
      eq: { user_id: user.id },
      order: { column: "created_at", ascending: false },
      limit
    }]
    : null;

  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(swrKey, supabaseFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  return {
    transactions: data || [],
    loading: isLoading,
    error,
    refreshTransactions: mutate,
  };
}
