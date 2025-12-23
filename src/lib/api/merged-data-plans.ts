// Optimized Merged Data Plans Service
// Features: Circuit breaker, stale-while-revalidate, parallel fetching, graceful degradation

import * as inlomax from './inlomax';
import * as smeplug from './smeplug';

export type Provider = 'inlomax' | 'smeplug';

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
  isCheapest?: boolean;
  alternativeProvider?: Provider;
  alternativePrice?: number;
  savings?: number;
}

export interface ProviderStatus {
  healthy: boolean;
  planCount: number;
  lastSuccess: number;
  consecutiveFailures: number;
  circuitOpen: boolean;
}

export interface CacheMeta {
  cachedAt: number;
  isStale: boolean;
  isFresh: boolean;
  providers: Record<Provider, ProviderStatus>;
  totalPlans: number;
}

// Network ID mappings
const INLOMAX_NETWORK_IDS: Record<string, string> = {
  MTN: '1', AIRTEL: '2', GLO: '3', '9MOBILE': '4',
};

const SMEPLUG_NETWORK_IDS: Record<string, string> = {
  MTN: '1', AIRTEL: '2', '9MOBILE': '3', GLO: '4',
};

// Circuit breaker config
const CIRCUIT_BREAKER = {
  failureThreshold: 3,
  resetTimeout: 5 * 60 * 1000, // 5 minutes
  halfOpenTimeout: 30 * 1000, // 30 seconds for test request
};

// Cache config
const CACHE_CONFIG = {
  freshTTL: 5 * 60 * 1000,      // 5 minutes - data is fresh
  staleTTL: 30 * 60 * 1000,     // 30 minutes - max stale age
  fetchTimeout: 10 * 1000,      // 10 seconds per provider
};

// Provider health state
const providerStatus: Record<Provider, ProviderStatus> = {
  inlomax: {
    healthy: true,
    planCount: 0,
    lastSuccess: Date.now(),
    consecutiveFailures: 0,
    circuitOpen: false,
  },
  smeplug: {
    healthy: true,
    planCount: 0,
    lastSuccess: Date.now(),
    consecutiveFailures: 0,
    circuitOpen: false,
  },
};

// Cache state
interface CacheState {
  data: Record<string, MergedDataPlan[]> | null;
  timestamp: number;
  refreshing: boolean;
  lastError: string | null;
}

let cache: CacheState = {
  data: null,
  timestamp: 0,
  refreshing: false,
  lastError: null,
};

// Check if circuit should allow request
function shouldAllowRequest(provider: Provider): boolean {
  const status = providerStatus[provider];
  
  if (!status.circuitOpen) return true;
  
  // Check if reset timeout has passed (half-open state)
  const timeSinceLastFailure = Date.now() - status.lastSuccess;
  if (timeSinceLastFailure > CIRCUIT_BREAKER.resetTimeout) {
    console.log(`[CIRCUIT] ${provider} entering half-open state`);
    return true;
  }
  
  return false;
}

// Record success for provider
function recordSuccess(provider: Provider, planCount: number) {
  const status = providerStatus[provider];
  status.healthy = true;
  status.planCount = planCount;
  status.lastSuccess = Date.now();
  status.consecutiveFailures = 0;
  status.circuitOpen = false;
  console.log(`[CIRCUIT] ${provider} success - ${planCount} plans`);
}

// Record failure for provider
function recordFailure(provider: Provider, error: string) {
  const status = providerStatus[provider];
  status.consecutiveFailures++;
  status.healthy = false;
  
  if (status.consecutiveFailures >= CIRCUIT_BREAKER.failureThreshold) {
    status.circuitOpen = true;
    console.warn(`[CIRCUIT] ${provider} circuit OPEN after ${status.consecutiveFailures} failures: ${error}`);
  } else {
    console.warn(`[CIRCUIT] ${provider} failure ${status.consecutiveFailures}/${CIRCUIT_BREAKER.failureThreshold}: ${error}`);
  }
}

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
  return 0;
}

function extractSizeString(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  return match ? `${match[1]}${match[2].toUpperCase()}` : 'Unknown';
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


// Fetch with timeout
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });
  return Promise.race([promise, timeout]);
}

// Fetch Inlomax plans with circuit breaker
async function fetchInlomaxPlans(): Promise<Record<string, MergedDataPlan[]>> {
  const plans: Record<string, MergedDataPlan[]> = {
    MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [],
  };

  if (!shouldAllowRequest('inlomax')) {
    console.log('[FETCH] Skipping Inlomax - circuit open');
    return plans;
  }

  try {
    const result = await fetchWithTimeout(
      inlomax.getServices(),
      CACHE_CONFIG.fetchTimeout
    );
    
    if (result.status !== 'success' || !result.data?.dataPlans) {
      throw new Error('Invalid response');
    }

    let totalPlans = 0;
    // Track seen IDs per network to avoid duplicates
    const seenIds: Record<string, Set<string>> = {
      MTN: new Set(), AIRTEL: new Set(), GLO: new Set(), '9MOBILE': new Set(),
    };
    
    for (const plan of result.data.dataPlans) {
      const network = plan.network.toUpperCase();
      const targetNetwork = network === 'ETISALAT' ? '9MOBILE' : network;
      if (!plans[targetNetwork]) continue;

      const price = parseFloat(plan.amount.replace(/,/g, ''));
      if (isNaN(price) || price <= 0) continue;

      // Create unique ID by combining serviceID with type to avoid duplicates
      const uniqueId = `${plan.serviceID}-${plan.dataType || 'default'}`;
      
      // Skip if we've already seen this ID for this network
      if (seenIds[targetNetwork].has(uniqueId)) {
        console.log(`[INLOMAX] Skipping duplicate plan: ${uniqueId}`);
        continue;
      }
      seenIds[targetNetwork].add(uniqueId);

      const sizeInMB = extractSizeInMB(plan.dataPlan);
      const pricePerGB = sizeInMB > 0 ? Math.round((price / sizeInMB) * 1024) : 0;

      plans[targetNetwork].push({
        id: uniqueId, // Use unique ID instead of just serviceID
        provider: 'inlomax',
        network: targetNetwork,
        name: `${plan.dataPlan} [${plan.dataType}]`,
        size: extractSizeString(plan.dataPlan),
        sizeInMB,
        price,
        type: plan.dataType || extractType(plan.dataPlan),
        validity: plan.validity || '30 Days',
        pricePerGB,
      });
      totalPlans++;
    }

    recordSuccess('inlomax', totalPlans);
    return plans;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    recordFailure('inlomax', message);
    return plans;
  }
}

// Fetch SMEPlug plans with circuit breaker
async function fetchSmeplugPlans(): Promise<Record<string, MergedDataPlan[]>> {
  const plans: Record<string, MergedDataPlan[]> = {
    MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [],
  };

  if (!shouldAllowRequest('smeplug')) {
    console.log('[FETCH] Skipping SMEPlug - circuit open');
    return plans;
  }

  const networkMap: Record<string, string> = {
    '1': 'MTN', '2': 'AIRTEL', '3': '9MOBILE', '4': 'GLO',
  };

  try {
    const result = await fetchWithTimeout(
      smeplug.getDataPlans(),
      CACHE_CONFIG.fetchTimeout
    );
    
    if (!result.status || !result.data) {
      throw new Error('Invalid response');
    }

    let totalPlans = 0;
    for (const [networkId, networkPlans] of Object.entries(result.data)) {
      const network = networkMap[networkId];
      if (!network || !Array.isArray(networkPlans)) continue;

      for (const plan of networkPlans) {
        // Handle price as string or number
        const priceValue = typeof plan.price === 'string' ? plan.price : String(plan.price || 0);
        const price = parseFloat(priceValue);
        if (isNaN(price) || price <= 0) continue;

        const sizeInMB = extractSizeInMB(plan.name);
        const pricePerGB = sizeInMB > 0 ? Math.round((price / sizeInMB) * 1024) : 0;

        let validity = '30 Days';
        const validityMatch = plan.name.match(/(\d+)\s*(day|days|week|weeks|month|months)/i);
        if (validityMatch) {
          validity = `${validityMatch[1]} ${validityMatch[2]}`;
        }

        plans[network].push({
          id: String(plan.id), // Ensure ID is a string
          provider: 'smeplug',
          network,
          name: plan.name,
          size: extractSizeString(plan.name),
          sizeInMB,
          price,
          type: extractType(plan.name),
          validity,
          pricePerGB,
        });
        totalPlans++;
      }
    }

    recordSuccess('smeplug', totalPlans);
    return plans;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    recordFailure('smeplug', message);
    return plans;
  }
}


// Merge plans from both providers - pick cheapest, keep unique
function mergePlans(
  inlomaxPlans: Record<string, MergedDataPlan[]>,
  smeplugPlans: Record<string, MergedDataPlan[]>
): Record<string, MergedDataPlan[]> {
  const merged: Record<string, MergedDataPlan[]> = {
    MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [],
  };

  for (const network of Object.keys(merged)) {
    const allPlans = [...inlomaxPlans[network], ...smeplugPlans[network]];
    
    // First, deduplicate by provider+id to avoid duplicate keys
    const uniquePlans = new Map<string, MergedDataPlan>();
    for (const plan of allPlans) {
      const uniqueKey = `${plan.provider}-${plan.id}`;
      // Keep the first occurrence (or could compare and keep better one)
      if (!uniquePlans.has(uniqueKey)) {
        uniquePlans.set(uniqueKey, plan);
      }
    }
    
    // Group by size (within 10% tolerance) and type
    const planGroups: Map<string, MergedDataPlan[]> = new Map();

    for (const plan of uniquePlans.values()) {
      const sizeKey = Math.round(plan.sizeInMB / 100) * 100;
      const key = `${sizeKey}-${plan.type}`;
      
      if (!planGroups.has(key)) {
        planGroups.set(key, []);
      }
      planGroups.get(key)!.push(plan);
    }

    // Track which plans we've added to avoid duplicates
    const addedPlanKeys = new Set<string>();

    // For each group, pick cheapest and note alternatives
    for (const [, groupPlans] of planGroups) {
      groupPlans.sort((a, b) => a.price - b.price);

      if (groupPlans.length === 1) {
        const plan = groupPlans[0];
        const planKey = `${plan.provider}-${plan.id}`;
        if (!addedPlanKeys.has(planKey)) {
          plan.isCheapest = true;
          merged[network].push(plan);
          addedPlanKeys.add(planKey);
        }
      } else {
        const cheapest = groupPlans[0];
        const cheapestKey = `${cheapest.provider}-${cheapest.id}`;
        
        if (!addedPlanKeys.has(cheapestKey)) {
          cheapest.isCheapest = true;

          const alternative = groupPlans.find(p => p.provider !== cheapest.provider);
          if (alternative) {
            cheapest.alternativeProvider = alternative.provider;
            cheapest.alternativePrice = alternative.price;
            cheapest.savings = alternative.price - cheapest.price;
          }

          merged[network].push(cheapest);
          addedPlanKeys.add(cheapestKey);
        }

        // Add significantly different plans from other providers
        for (let i = 1; i < groupPlans.length; i++) {
          const plan = groupPlans[i];
          const planKey = `${plan.provider}-${plan.id}`;
          if (!addedPlanKeys.has(planKey) && plan.price > cheapest.price * 1.2) {
            plan.isCheapest = false;
            merged[network].push(plan);
            addedPlanKeys.add(planKey);
          }
        }
      }
    }

    // Sort by size, then price
    merged[network].sort((a, b) => {
      if (a.sizeInMB !== b.sizeInMB) return a.sizeInMB - b.sizeInMB;
      return a.price - b.price;
    });
  }

  return merged;
}

// Background refresh function
async function refreshCache(): Promise<void> {
  if (cache.refreshing) {
    console.log('[CACHE] Refresh already in progress');
    return;
  }

  cache.refreshing = true;
  console.log('[CACHE] Starting background refresh...');

  try {
    const [inlomaxPlans, smeplugPlans] = await Promise.all([
      fetchInlomaxPlans(),
      fetchSmeplugPlans(),
    ]);

    const merged = mergePlans(inlomaxPlans, smeplugPlans);
    
    // Only update if we got some data
    const totalPlans = Object.values(merged).reduce((sum, plans) => sum + plans.length, 0);
    
    if (totalPlans > 0) {
      cache.data = merged;
      cache.timestamp = Date.now();
      cache.lastError = null;
      console.log(`[CACHE] Refreshed with ${totalPlans} plans`);
    } else if (!cache.data) {
      cache.lastError = 'No plans available from any provider';
      console.error('[CACHE] No plans fetched and no cached data');
    }
  } catch (error) {
    cache.lastError = error instanceof Error ? error.message : 'Refresh failed';
    console.error('[CACHE] Refresh error:', cache.lastError);
  } finally {
    cache.refreshing = false;
  }
}

// Get cache freshness status
function getCacheStatus(): { isFresh: boolean; isStale: boolean; age: number } {
  const age = Date.now() - cache.timestamp;
  return {
    isFresh: age < CACHE_CONFIG.freshTTL,
    isStale: age >= CACHE_CONFIG.freshTTL && age < CACHE_CONFIG.staleTTL,
    age,
  };
}

// Main function - get merged plans with stale-while-revalidate
export async function getMergedDataPlans(
  forceRefresh = false
): Promise<{ plans: Record<string, MergedDataPlan[]>; meta: CacheMeta }> {
  const status = getCacheStatus();
  
  // If force refresh or no cache, fetch synchronously
  if (forceRefresh || !cache.data) {
    await refreshCache();
  } 
  // If stale, serve cached and refresh in background
  else if (!status.isFresh && !cache.refreshing) {
    // Don't await - let it refresh in background
    refreshCache().catch(console.error);
  }

  const meta: CacheMeta = {
    cachedAt: cache.timestamp,
    isFresh: status.isFresh,
    isStale: status.isStale,
    providers: { ...providerStatus },
    totalPlans: cache.data 
      ? Object.values(cache.data).reduce((sum, plans) => sum + plans.length, 0)
      : 0,
  };

  return {
    plans: cache.data || { MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [] },
    meta,
  };
}

// Get plans for specific network
export async function getNetworkPlans(network: string): Promise<MergedDataPlan[]> {
  const { plans } = await getMergedDataPlans();
  return plans[network.toUpperCase()] || [];
}

// Get plan by ID and provider
export async function getPlanById(
  planId: string,
  provider: Provider
): Promise<MergedDataPlan | null> {
  const { plans } = await getMergedDataPlans();
  
  for (const network of Object.keys(plans)) {
    const plan = plans[network].find(p => p.id === planId && p.provider === provider);
    if (plan) return plan;
  }
  
  return null;
}

// Find cheapest plan for size
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
  
  return matching.reduce((cheapest, plan) => 
    plan.price < cheapest.price ? plan : cheapest
  );
}

// Get plans grouped by type
export async function getPlansByType(network: string): Promise<Record<string, MergedDataPlan[]>> {
  const plans = await getNetworkPlans(network);
  const grouped: Record<string, MergedDataPlan[]> = {};
  
  for (const plan of plans) {
    if (!grouped[plan.type]) grouped[plan.type] = [];
    grouped[plan.type].push(plan);
  }
  
  return grouped;
}

// Get best deals (lowest price per GB)
export async function getBestDeals(network: string, limit = 5): Promise<MergedDataPlan[]> {
  const plans = await getNetworkPlans(network);
  return plans
    .filter(p => p.pricePerGB > 0)
    .sort((a, b) => a.pricePerGB - b.pricePerGB)
    .slice(0, limit);
}

// Clear cache
export function clearPlansCache() {
  cache = { data: null, timestamp: 0, refreshing: false, lastError: null };
  console.log('[CACHE] Cleared');
}

// Get provider plan ID for purchase
export function getProviderPlanId(plan: MergedDataPlan): {
  provider: Provider;
  planId: string;
  networkId: string;
} {
  const networkIds = plan.provider === 'inlomax' ? INLOMAX_NETWORK_IDS : SMEPLUG_NETWORK_IDS;
  return {
    provider: plan.provider,
    planId: plan.id,
    networkId: networkIds[plan.network] || '1',
  };
}

// Get provider status
export function getProviderHealthStatus(): Record<Provider, ProviderStatus> {
  return { ...providerStatus };
}

// Reset provider circuit breaker (admin use)
export function resetProviderCircuit(provider: Provider) {
  providerStatus[provider] = {
    healthy: true,
    planCount: 0,
    lastSuccess: Date.now(),
    consecutiveFailures: 0,
    circuitOpen: false,
  };
  console.log(`[CIRCUIT] ${provider} reset`);
}
