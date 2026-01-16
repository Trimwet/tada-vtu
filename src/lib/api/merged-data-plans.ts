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
  description?: string;
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
  freshTTL: 2 * 60 * 1000,      // 2 minutes - shorter TTL for faster updates
  staleTTL: 10 * 60 * 1000,     // 10 minutes
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

interface PlanSizeInfo {
  size: string;
  sizeInMB: number;
}

function extractPlanSize(name: string): PlanSizeInfo {
  const upperName = name.toUpperCase();

  // Handle UNLIMITED plans
  if (upperName.includes("UNLIMITED")) {
    return { size: "UNLIMITED", sizeInMB: 999999 }; // Arbitrary large number for sorting
  }

  // Handle Airtime/Talkmore plans (avoid parsing price as size)
  if (upperName.includes("TALKMORE") ||
    upperName.includes("AIRTIME") ||
    /₦\s*\d/.test(name) ||
    /N\s*\d/.test(upperName)) {
    // If it has airtime keywords, only accept explicit size units
    const strictMatch = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)(?!PS)/i);
    if (strictMatch) {
      const value = parseFloat(strictMatch[1]);
      const unit = strictMatch[2].toUpperCase();
      let sizeInMB = value;
      if (unit === 'GB') sizeInMB = value * 1024;
      if (unit === 'TB') sizeInMB = value * 1024 * 1024;
      return { size: `${value}${unit}`, sizeInMB };
    }
    return { size: name, sizeInMB: 0 }; // Return original name if no clear data size
  }

  // Standard extraction with unit (ignoring MBPS)
  const match = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)(?!PS)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    let sizeInMB = value;
    if (unit === 'GB') sizeInMB = value * 1024;
    if (unit === 'TB') sizeInMB = value * 1024 * 1024;
    return { size: `${value}${unit}`, sizeInMB };
  }

  // Fallback: Number extraction (conservative)
  // Only assume GB if we are SURE it's a data plan name and not a price
  // We've already filtered out "N400" style strings above roughly, but let's be careful.
  const simpleMatch = name.match(/^(\d+(?:\.\d+)?)\s*$/); // Only if the WHOLE string is a number? No usually "500 Data"

  // If no unit is found, and it's not clearly airtime, we used to default to GB.
  // But that caused "400" to be "400GB".
  // Let's only default to GB if it's a small typically GB number (1-100) AND doesn't look like money.
  const numberMatch = name.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const value = parseFloat(numberMatch[1]);

    // Safety check: Is this likely a price? (Values > 100 often meant MB before, but now could be price)
    // If value matches the price exactly, it's probably the price in the name "N1000 1GB" -> 1000 is price.
    // This is hard to distinguish without more context.

    // Let's rely on the fact that most VALID plans have GB/MB.
    // If implied, it's usually small integers for GB.
    if (value >= 1 && value <= 100 && !name.includes('₦')) {
      return { size: `${value}GB`, sizeInMB: value * 1024 };
    }
  }

  return { size: name, sizeInMB: 0 };
}

function extractSizeInMB(name: string): number {
  return extractPlanSize(name).sizeInMB;
}

function extractSizeString(name: string): string {
  const { size, sizeInMB } = extractPlanSize(name);
  if (sizeInMB === 0 && size === name) {
    // If we couldn't extract a size, and just returned the name,
    // try to clean it up a bit if it's very long
    const cleanName = name.split('[')[0].trim();
    return cleanName.length < 30 ? cleanName : "Special Plan";
  }
  return size;
}

function normalizeDataType(dataType: string, planName: string): string {
  const type = (dataType || '').toUpperCase().trim();
  const name = planName.toUpperCase();

  // Check for specific plan types based on dataType first, then plan name
  if (type.includes('SME') && type.includes('SHARE')) return 'SME_SHARE';
  if (name.includes('SME') && name.includes('SHARE')) return 'SME_SHARE';
  if (type.includes('SME') || name.includes('SME')) return 'SME';

  if (type.includes('CORPORATE') && type.includes('GIFTING')) return 'CORPORATE_GIFTING';
  if (type === 'CG' || name.includes('CG')) return 'CORPORATE_GIFTING';
  if (type.includes('CORPORATE') || name.includes('CORPORATE')) return 'CORPORATE';

  if (type.includes('GIFTING') || name.includes('GIFTING')) return 'GIFTING';
  if (type.includes('AWOOF') || name.includes('AWOOF')) return 'AWOOF'; // Distinct from gifting now

  if (type.includes('DIRECT') || name.includes('DIRECT')) return 'DIRECT';
  if (type.includes('SOCIAL') || name.includes('SOCIAL')) return 'SOCIAL';

  // If dataType is provided and not empty, use it as is (normalized)
  if (type) return type.replace(/\s+/g, '_');

  // Default to STANDARD if no type is detected
  return 'STANDARD';
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

      const costPrice = parseFloat(plan.amount.replace(/,/g, ''));
      if (isNaN(costPrice) || costPrice <= 0) continue;

      // Use Inlomax cost price directly (no markup) to compete with OPay
      const price = costPrice;

      // Create unique ID
      const uniqueId = `${plan.serviceID}-${plan.dataType || 'default'}`;
      if (seenIds.has(uniqueId)) continue;
      seenIds.add(uniqueId);

      const sizeInMB = extractSizeInMB(plan.dataPlan);
      const pricePerGB = sizeInMB > 0 ? Math.round((price / sizeInMB) * 1024) : 0;
      const extractedSize = extractSizeString(plan.dataPlan);

      // Clean up description: remove ALL size references to avoid duplication
      let cleanDescription = (plan.dataPlan || '').trim();
      
      // Remove all size patterns (e.g., "1GB", "1.0 GB", "1.0GB", "500MB", etc.)
      // This regex matches: number + optional decimal + optional space + GB/MB/TB
      cleanDescription = cleanDescription.replace(/\d+(?:\.\d+)?\s*(?:GB|MB|TB)(?!PS)/gi, '').trim();
      
      // Remove leading/trailing separators and extra spaces
      cleanDescription = cleanDescription.replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
      cleanDescription = cleanDescription.replace(/\s+/g, ' ').trim();
      
      // If description is now empty or just contains validity info, keep validity
      if (!cleanDescription || cleanDescription.length < 2) {
        cleanDescription = '';
      }

      // Format the plan name to show both dataPlan and dataType clearly
      const planType = plan.dataType || normalizeDataType(plan.dataType || '', plan.dataPlan);
      const displayName = plan.dataPlan.trim();

      plans[targetNetwork].push({
        id: uniqueId,
        provider: 'inlomax',
        network: targetNetwork,
        name: displayName,
        description: cleanDescription || undefined,
        size: extractedSize,
        sizeInMB,
        price,
        type: planType,
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