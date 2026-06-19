"use client";

import useSWR from "swr";
import { useMemo } from "react";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch frequent plans");
  const json = await res.json();
  return json.plans as Array<{
    id: string;
    user_id: string;
    service_type: "data" | "airtime";
    network: string | null;
    plan_id: string | null;
    plan_name: string | null;
    amount: number | null;
    purchase_count: number;
    last_purchased_at: string;
    created_at: string;
  }>;
}

export function useFrequentPlans() {
  const { data, error, isValidating } = useSWR(
    "/api/user/frequent-plans",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  return useMemo(
    () => ({
      plans: data ?? [],
      loading: !data && !error,
      error,
      isValidating,
    }),
    [data, error, isValidating]
  );
}
