// Smart Provider Router - Simplified to Inlomax-Only
// Documentation: https://inlomax.com/api-docs
// LAZY LOADING: inlomax module only imported when API calls are made

export type Provider = 'inlomax';

export interface ProviderHealth {
  provider: Provider;
  isHealthy: boolean;
  lastCheck: number;
}

// In-memory health tracking (simplified for single provider)
const providerHealth: Record<Provider, ProviderHealth> = {
  inlomax: {
    provider: 'inlomax',
    isHealthy: true,
    lastCheck: Date.now(),
  },
};

// ============ UNIFIED AIRTIME PURCHASE ============
export interface AirtimePurchaseParams {
  network: string;
  phone: string;
  amount: number;
  userId: string;
}

export interface AirtimePurchaseResult {
  success: boolean;
  provider: Provider;
  reference: string;
  message: string;
  amount: number;
  amountCharged?: number;
}

export async function purchaseAirtime(
  params: AirtimePurchaseParams
): Promise<AirtimePurchaseResult> {
  // Dynamic import to prevent module-level API initialization
  const inlomax = await import('./inlomax');
  
  const result = await inlomax.purchaseAirtime({
    network: params.network,
    phone: params.phone,
    amount: params.amount,
  });

  return {
    success: result.status === 'success',
    provider: 'inlomax',
    reference: result.data?.reference || `INL_${Date.now()}`,
    message: result.message,
    amount: params.amount,
    amountCharged: result.data?.amountCharged,
  };
}

// ============ UNIFIED DATA PURCHASE ============
export interface DataPurchaseParams {
  network: string;
  phone: string;
  planId: string;
  amount: number;
  planName: string;
  userId: string;
  provider?: Provider;
}

export interface DataPurchaseResult {
  success: boolean;
  provider: Provider;
  reference: string;
  message: string;
  amount: number;
  planName: string;
}

export async function purchaseData(
  params: DataPurchaseParams
): Promise<DataPurchaseResult> {
  // Dynamic import to prevent module-level API initialization
  const inlomax = await import('./inlomax');
  
  const result = await inlomax.purchaseData({
    serviceID: params.planId,
    phone: params.phone,
  });

  return {
    success: result.status === 'success',
    provider: 'inlomax',
    reference: result.data?.reference || `INL_${Date.now()}`,
    message: result.message,
    amount: params.amount,
    planName: params.planName,
  };
}

// ============ UTILITIES ============
export function getProviderStatus(): Record<Provider, ProviderHealth> {
  return { ...providerHealth };
}

// Re-export merged data plans functions for convenience
export {
  getMergedDataPlans,
  getNetworkPlans,
  getBestDeals,
  getPlansByType,
  findCheapestPlan,
  clearPlansCache,
  type MergedDataPlan,
} from './merged-data-plans';
