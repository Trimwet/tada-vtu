// Simplified Inlomax Data Plans Service
// Features: Local caching, stale-while-revalidate, Inlomax integration
// LAZY LOADING: API calls only happen when explicitly requested, not during module init

import { withRetry } from '../api-utils';

export type Provider = 'inlomax';

export interface MergedDataPlan {
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

export interface CacheMeta {
  cachedAt: number;
  isStale: boolean;
  isFresh: boolean;
  totalPlans: number;
}

// Network ID mapping for Inlomax
const INLOMAX_NETWORK_IDS: Record<string, string> = {
  MTN: '1', AIRTEL: '2', GLO: '3', '9MOBILE': '4',
};

// Cache config
const CACHE_CONFIG = {
  freshTTL: 5 * 60 * 1000,      // 5 minutes - data is fresh
  staleTTL: 60 * 60 * 1000,     // 60 minutes - max stale age
  fetchTimeout: 15 * 1000,      // 15 seconds
};

// Cache state
interface CacheState {
  data: Record<string, MergedDataPlan[]> | null;
  timestamp: number;
  refreshing: boolean;
}

let cache: CacheState = {
  data: null,
  timestamp: 0,
  refreshing: false,
};

// Extract size in MB from plan name
function extractSizeInMB(name: string): number {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return value * 1024;
    if (unit === 'TB') return value * 1024 * 1024;
    return value;
  }

  // For Talk More plans or other plans without explicit units, try to get the first number
  const simpleMatch = name.match(/(\d+(?:\.\d+)?)/);
  if (simpleMatch) {
    const value = parseFloat(simpleMatch[1]);
    // If it's a large number, it might be MB or a code, but we use it as a heuristic
    return value < 50 ? value * 1024 : value;
  }

  return 0;
}

function extractSizeString(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  if (match) return `${match[1]}${match[2].toUpperCase()}`;

  // Handle plans without units like "MTN Talk More ₦200"
  const cleanName = name.split('[')[0].trim();
  // If it's short, use it as the size label
  if (cleanName.length < 20) return cleanName;

  // Otherwise try to find the price/value
  const valueMatch = name.match(/(\d+(?:\.\d+)?)/);
  if (valueMatch) return valueMatch[0];

  return name;
}

function extractType(name: string, dataType?: string): string {
  if (dataType) return dataType;
  const upper = name.toUpperCase();
  if (upper.includes('SME')) return 'SME';
  if (upper.includes('CORPORATE') || upper.includes('CG')) return 'CORPORATE';
  if (upper.includes('GIFTING')) return 'GIFTING';
  if (upper.includes('DIRECT')) return 'DIRECT';
  if (upper.includes('AWOOF')) return 'AWOOF';
  if (upper.includes('SOCIAL')) return 'SOCIAL';
  if (upper.includes('SHARE')) return 'DATA SHARE';
  return 'OTHER';
}

// Fetch Inlomax plans - LAZY: only imports inlomax module when called
async function fetchInlomaxPlans(): Promise<Record<string, MergedDataPlan[]>> {
  const plans: Record<string, MergedDataPlan[]> = {
    MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [],
  };

  try {
    // Dynamic import to prevent module-level API calls during compilation
    const inlomax = await import('./inlomax');
    
    const result = await withRetry(
      () => inlomax.getServices(),
      {
        maxRetries: 3,
        delayMs: 2000,
        onRetry: (attempt, error) => {
          console.warn(`[INLOMAX FETCH] Retry ${attempt}/3 due to error:`, error.message);
        }
      }
    );

    if (result.status !== 'success' || !result.data?.dataPlans) {
      throw new Error('Invalid response from Inlomax');
    }

    const seenIds = new Set<string>();
    console.log('[DEBUG] Processing Inlomax data plans:', result.data.dataPlans.length, 'total plans');

    for (const plan of result.data.dataPlans) {
      const network = plan.network.toUpperCase();
      const targetNetwork = network === 'ETISALAT' ? '9MOBILE' : network;
      if (!plans[targetNetwork]) continue;

      // Debug log for first few plans of each network
      if (plans[targetNetwork].length < 3) {
        console.log(`[DEBUG] ${targetNetwork} plan:`, {
          dataPlan: plan.dataPlan,
          dataType: plan.dataType,
          amount: plan.amount,
          serviceID: plan.serviceID
        });
      }

      const price = parseFloat(plan.amount.replace(/,/g, ''));
      if (isNaN(price) || price <= 0) continue;

      // Create unique ID
      const uniqueId = `${plan.serviceID}-${plan.dataType || 'default'}`;
      if (seenIds.has(uniqueId)) continue;
      seenIds.add(uniqueId);

      const sizeInMB = extractSizeInMB(plan.dataPlan);
      const pricePerGB = sizeInMB > 0 ? Math.round((price / sizeInMB) * 1024) : 0;

      plans[targetNetwork].push({
        id: uniqueId,
        provider: 'inlomax',
        network: targetNetwork,
        name: `${plan.dataPlan} [${plan.dataType || 'Standard'}]`,
        size: extractSizeString(plan.dataPlan),
        sizeInMB,
        price,
        type: plan.dataType || extractType(plan.dataPlan), // Use Inlomax dataType directly
        validity: plan.validity || '30 Days',
        pricePerGB,
      });
    }

    // Sort networks by size/price
    for (const net of Object.keys(plans)) {
      plans[net].sort((a, b) => {
        if (a.sizeInMB !== b.sizeInMB) return a.sizeInMB - b.sizeInMB;
        return a.price - b.price;
      });
    }

    return plans;
  } catch (error) {
    console.error('[INLOMAX FETCH] Error:', error);
    return plans;
  }
}

// Cache refresh
async function refreshCache(): Promise<void> {
  if (cache.refreshing) return;
  cache.refreshing = true;

  try {
    const freshData = await fetchInlomaxPlans();
    const totalPlans = Object.values(freshData).reduce((sum, plans) => sum + plans.length, 0);

    if (totalPlans > 0) {
      cache.data = freshData;
      cache.timestamp = Date.now();
    }
  } finally {
    cache.refreshing = false;
  }
}

// Main accessor
export async function getMergedDataPlans(
  forceRefresh = false
): Promise<{ plans: Record<string, MergedDataPlan[]>; meta: CacheMeta }> {
  const age = Date.now() - cache.timestamp;
  const isFresh = age < CACHE_CONFIG.freshTTL;
  const isStale = !isFresh && age < CACHE_CONFIG.staleTTL;

  if (forceRefresh || !cache.data) {
    await refreshCache();
  } else if (!isFresh && !cache.refreshing) {
    refreshCache().catch(console.error);
  }

  return {
    plans: cache.data || { MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [] },
    meta: {
      cachedAt: cache.timestamp,
      isFresh,
      isStale,
      totalPlans: cache.data
        ? Object.values(cache.data).reduce((sum, plans) => sum + plans.length, 0)
        : 0,
    },
  };
}

export async function getNetworkPlans(network: string): Promise<MergedDataPlan[]> {
  const { plans } = await getMergedDataPlans();
  return plans[network.toUpperCase()] || [];
}

export async function getBestDeals(network: string, limit = 5): Promise<MergedDataPlan[]> {
  const plans = await getNetworkPlans(network);
  return plans
    .filter(p => p.pricePerGB > 0)
    .sort((a, b) => a.pricePerGB - b.pricePerGB)
    .slice(0, limit);
}

export async function getPlansByType(network: string): Promise<Record<string, MergedDataPlan[]>> {
  const plans = await getNetworkPlans(network);
  const grouped: Record<string, MergedDataPlan[]> = {};
  for (const plan of plans) {
    if (!grouped[plan.type]) grouped[plan.type] = [];
    grouped[plan.type].push(plan);
  }
  return grouped;
}

export async function findCheapestPlan(
  network: string,
  sizeInMB: number,
  tolerance = 0.2
): Promise<MergedDataPlan | null> {
  const plans = await getNetworkPlans(network);
  const minSize = sizeInMB * (1 - tolerance);
  const maxSize = sizeInMB * (1 + tolerance);
  const matching = plans.filter(p => p.sizeInMB >= minSize && p.sizeInMB <= maxSize);
  if (matching.length === 0) return null;
  return matching.reduce((cheapest, plan) => plan.price < cheapest.price ? plan : cheapest);
}

export function clearPlansCache() {
  cache = { data: null, timestamp: 0, refreshing: false };
  console.log('[DEBUG] Plans cache cleared');
}

export function getProviderHealthStatus() {
  return { inlomax: { healthy: true } };
}

export function resetProviderCircuit() {
  // No-op in simplified version
}
