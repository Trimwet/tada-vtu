'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type Provider = 'inlomax';

export interface DataPlan {
  id: string;
  provider: Provider;
  network: string;
  name: string;
  size: string;
  sizeInMB: number;
  price: number;
  type: string;
  validity: string;
  pricePerGB: number;
}

export interface DataPlansMeta {
  cachedAt: number;
  isFresh: boolean;
  isStale: boolean;
  totalPlans: number;
}

interface DataPlansState {
  plans: DataPlan[];
  plansByType: Record<string, DataPlan[]>;
  types: string[];
  meta: DataPlansMeta | null;
  loading: boolean;
  error: string | null;
  lastFetch: number;
}

interface UseDataPlansOptions {
  network: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const STORAGE_KEY = 'tada_data_plans_cache';
const LOCAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Load from localStorage
function loadFromStorage(network: string): DataPlansState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${network}`);
    if (!stored) return null;

    const data = JSON.parse(stored);
    const age = Date.now() - data.lastFetch;

    // Return cached data if not too old
    if (age < LOCAL_CACHE_TTL * 6) { // 30 min max local cache
      return data;
    }
  } catch {
    // Ignore storage errors
  }

  return null;
}

// Save to localStorage
function saveToStorage(network: string, state: DataPlansState) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(`${STORAGE_KEY}_${network}`, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function useDataPlans({ network, autoRefresh = true, refreshInterval = 60000 }: UseDataPlansOptions) {
  const [state, setState] = useState<DataPlansState>(() => {
    // Try to load from localStorage for instant initial render
    const cached = loadFromStorage(network);
    if (cached && cached.plans.length > 0) {
      return { ...cached, loading: false };
    }
    // Only show loading state if we have no cached data AND a network is selected
    return {
      plans: [],
      plansByType: {},
      types: [],
      meta: null,
      loading: !!network, // Only show loading if network is selected
      error: null,
      lastFetch: 0,
    };
  });

  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchPlans = useCallback(async (forceRefresh = false) => {
    // Don't fetch if no network selected
    if (!network) {
      setState(prev => ({
        ...prev,
        plans: [],
        plansByType: {},
        types: [],
        loading: false,
        error: null,
      }));
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const url = `/api/data-plans?network=${network}${forceRefresh ? '&refresh=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!mountedRef.current) return;

      if (data.success) {
        // Ensure plans is always an array
        const plansArray = Array.isArray(data.plans) ? data.plans : [];

        const newState: DataPlansState = {
          plans: plansArray,
          plansByType: data.byType || {},
          types: data.types || [],
          meta: data.meta || null,
          loading: false,
          error: null,
          lastFetch: Date.now(),
        };

        setState(newState);
        saveToStorage(network, newState);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to fetch plans',
        }));
      }
    } catch (error) {
      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Network error',
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [network]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    // Don't fetch if no network selected
    if (!network) {
      setState({
        plans: [],
        plansByType: {},
        types: [],
        meta: null,
        loading: false, // Keep loading false when no network selected
        error: null,
        lastFetch: 0,
      });
      return;
    }

    // If we have cached data, show it immediately but still fetch fresh
    const cached = loadFromStorage(network);
    if (cached && cached.plans.length > 0) {
      setState(prev => ({ ...prev, ...cached, loading: false }));
      // Fetch fresh data in background
      fetchPlans(false);
    } else {
      // Keep loading true while fetching for the first time
      setState(prev => ({ ...prev, loading: true }));
      fetchPlans(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [network, fetchPlans]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const age = Date.now() - state.lastFetch;
      if (age > LOCAL_CACHE_TTL) {
        fetchPlans(false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, state.lastFetch, fetchPlans]);

  // Refresh on window focus
  useEffect(() => {
    if (!autoRefresh) return;

    const handleFocus = () => {
      const age = Date.now() - state.lastFetch;
      if (age > LOCAL_CACHE_TTL) {
        fetchPlans(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [autoRefresh, state.lastFetch, fetchPlans]);

  const refresh = useCallback(() => fetchPlans(true), [fetchPlans]);

  const getPlansByType = useCallback((type: string) => {
    return state.plansByType[type] || [];
  }, [state.plansByType]);

  const getBestDeals = useCallback((limit = 5) => {
    return [...state.plans]
      .filter(p => p.pricePerGB > 0)
      .sort((a, b) => a.pricePerGB - b.pricePerGB)
      .slice(0, limit);
  }, [state.plans]);

  const findPlanById = useCallback((id: string) => {
    return state.plans.find(p => p.id === id) || null;
  }, [state.plans]);

  return {
    plans: Array.isArray(state.plans) ? state.plans : [],
    plansByType: state.plansByType || {},
    types: Array.isArray(state.types) ? state.types : [],
    meta: state.meta,
    loading: state.loading,
    error: state.error,
    isStale: state.meta?.isStale || false,
    isFresh: state.meta?.isFresh || false,
    refresh,
    getPlansByType,
    getBestDeals,
    findPlanById,
  };
}

// Hook for all networks
export function useAllDataPlans() {
  const [state, setState] = useState<{
    plans: Record<string, DataPlan[]>;
    meta: DataPlansMeta | null;
    loading: boolean;
    error: string | null;
  }>({
    plans: { MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [] },
    meta: null,
    loading: true,
    error: null,
  });

  const fetchPlans = useCallback(async (forceRefresh = false) => {
    try {
      const url = `/api/data-plans${forceRefresh ? '?refresh=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setState({
          plans: data.plans,
          meta: data.meta,
          loading: false,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to fetch plans',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Network error',
      }));
    }
  }, []);

  useEffect(() => {
    fetchPlans(false);
  }, [fetchPlans]);

  return {
    ...state,
    refresh: () => fetchPlans(true),
  };
}