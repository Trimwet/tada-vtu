// Smart Provider Router
// Automatically routes transactions to the best provider (Inlomax or SMEPlug)
// Based on: availability, price, speed, and success rate

import * as inlomax from './inlomax';
import * as smeplug from './smeplug';
import { getPlanById, type MergedDataPlan } from './merged-data-plans';

export type Provider = 'inlomax' | 'smeplug';

export interface ProviderHealth {
  provider: Provider;
  isHealthy: boolean;
  lastCheck: number;
  successRate: number;
  avgResponseTime: number;
  failureCount: number;
}

// In-memory health tracking (in production, use Redis)
const providerHealth: Record<Provider, ProviderHealth> = {
  inlomax: {
    provider: 'inlomax',
    isHealthy: true,
    lastCheck: Date.now(),
    successRate: 100,
    avgResponseTime: 0,
    failureCount: 0,
  },
  smeplug: {
    provider: 'smeplug',
    isHealthy: true,
    lastCheck: Date.now(),
    successRate: 100,
    avgResponseTime: 0,
    failureCount: 0,
  },
};

// Health check cooldown (5 minutes)
const HEALTH_CHECK_COOLDOWN = 5 * 60 * 1000;
// Max failures before marking unhealthy
const MAX_FAILURES = 3;
// Recovery time after being marked unhealthy (10 minutes)
const RECOVERY_TIME = 10 * 60 * 1000;

// Update provider health after a transaction
export function updateProviderHealth(
  provider: Provider,
  success: boolean,
  responseTime: number
) {
  const health = providerHealth[provider];
  
  if (success) {
    health.failureCount = 0;
    health.isHealthy = true;
    // Update rolling average response time
    health.avgResponseTime = health.avgResponseTime === 0 
      ? responseTime 
      : (health.avgResponseTime * 0.8 + responseTime * 0.2);
    // Update success rate (rolling average)
    health.successRate = Math.min(100, health.successRate * 0.95 + 5);
  } else {
    health.failureCount++;
    health.successRate = Math.max(0, health.successRate * 0.9);
    
    if (health.failureCount >= MAX_FAILURES) {
      health.isHealthy = false;
      console.warn(`[ROUTER] Provider ${provider} marked unhealthy after ${MAX_FAILURES} failures`);
    }
  }
  
  health.lastCheck = Date.now();
}

// Check if provider should be retried after being unhealthy
function shouldRetryProvider(provider: Provider): boolean {
  const health = providerHealth[provider];
  if (health.isHealthy) return true;
  
  // Try to recover after RECOVERY_TIME
  return Date.now() - health.lastCheck > RECOVERY_TIME;
}

// Get the best provider for a service
export function getBestProvider(
  service: 'airtime' | 'data' | 'cable' | 'electricity' | 'transfer'
): Provider {
  // Services only available on specific providers
  if (service === 'cable' || service === 'electricity') {
    return 'inlomax'; // Only Inlomax has these
  }
  
  if (service === 'transfer') {
    return 'smeplug'; // Only SMEPlug has bank transfers
  }
  
  // For airtime and data, pick the healthiest provider
  const inlomaxHealth = providerHealth.inlomax;
  const smeplugHealth = providerHealth.smeplug;
  
  // If one is unhealthy, use the other
  if (!shouldRetryProvider('inlomax')) return 'smeplug';
  if (!shouldRetryProvider('smeplug')) return 'inlomax';
  
  // Both healthy - pick based on success rate and response time
  const inlomaxScore = inlomaxHealth.successRate - (inlomaxHealth.avgResponseTime / 100);
  const smeplugScore = smeplugHealth.successRate - (smeplugHealth.avgResponseTime / 100);
  
  return inlomaxScore >= smeplugScore ? 'inlomax' : 'smeplug';
}

// Get fallback provider
export function getFallbackProvider(primary: Provider): Provider | null {
  const fallback = primary === 'inlomax' ? 'smeplug' : 'inlomax';
  return shouldRetryProvider(fallback) ? fallback : null;
}

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
  const primaryProvider = getBestProvider('airtime');
  const startTime = Date.now();
  
  try {
    const result = await executeAirtimePurchase(primaryProvider, params);
    updateProviderHealth(primaryProvider, true, Date.now() - startTime);
    return { ...result, provider: primaryProvider };
  } catch (error) {
    console.error(`[ROUTER] ${primaryProvider} airtime failed:`, error);
    updateProviderHealth(primaryProvider, false, Date.now() - startTime);
    
    // Try fallback
    const fallbackProvider = getFallbackProvider(primaryProvider);
    if (fallbackProvider) {
      console.log(`[ROUTER] Trying fallback provider: ${fallbackProvider}`);
      const fallbackStart = Date.now();
      
      try {
        const result = await executeAirtimePurchase(fallbackProvider, params);
        updateProviderHealth(fallbackProvider, true, Date.now() - fallbackStart);
        return { ...result, provider: fallbackProvider };
      } catch (fallbackError) {
        console.error(`[ROUTER] ${fallbackProvider} airtime also failed:`, fallbackError);
        updateProviderHealth(fallbackProvider, false, Date.now() - fallbackStart);
      }
    }
    
    throw error;
  }
}

async function executeAirtimePurchase(
  provider: Provider,
  params: AirtimePurchaseParams
): Promise<Omit<AirtimePurchaseResult, 'provider'>> {
  const reference = generateReference(provider);
  
  if (provider === 'inlomax') {
    const result = await inlomax.purchaseAirtime({
      network: params.network,
      phone: params.phone,
      amount: params.amount,
    });
    
    return {
      success: result.status === 'success',
      reference: result.data?.reference || reference,
      message: result.message,
      amount: params.amount,
      amountCharged: result.data?.amountCharged,
    };
  } else {
    const result = await smeplug.purchaseAirtime({
      network: params.network,
      phone: params.phone,
      amount: params.amount,
      reference,
    });
    
    return {
      success: result.status === true,
      reference: result.reference || reference,
      message: result.message || 'Airtime purchase successful',
      amount: params.amount,
    };
  }
}

// ============ UNIFIED DATA PURCHASE ============
export interface DataPurchaseParams {
  network: string;
  phone: string;
  planId: string;
  amount: number;
  planName: string;
  userId: string;
  provider?: Provider; // Optional: specify provider from merged plans
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
  // If provider is specified (from merged plans), use it directly
  const primaryProvider = params.provider || getBestProvider('data');
  const startTime = Date.now();
  
  try {
    const result = await executeDataPurchase(primaryProvider, params);
    updateProviderHealth(primaryProvider, true, Date.now() - startTime);
    return { ...result, provider: primaryProvider };
  } catch (error) {
    console.error(`[ROUTER] ${primaryProvider} data failed:`, error);
    updateProviderHealth(primaryProvider, false, Date.now() - startTime);
    
    // Only try fallback if provider wasn't explicitly specified
    if (!params.provider) {
      const fallbackProvider = getFallbackProvider(primaryProvider);
      if (fallbackProvider) {
        console.log(`[ROUTER] Trying fallback provider: ${fallbackProvider}`);
        const fallbackStart = Date.now();
        
        try {
          const result = await executeDataPurchase(fallbackProvider, params);
          updateProviderHealth(fallbackProvider, true, Date.now() - fallbackStart);
          return { ...result, provider: fallbackProvider };
        } catch (fallbackError) {
          console.error(`[ROUTER] ${fallbackProvider} data also failed:`, fallbackError);
          updateProviderHealth(fallbackProvider, false, Date.now() - fallbackStart);
        }
      }
    }
    
    throw error;
  }
}

// Purchase data using a merged plan object
export async function purchaseDataWithPlan(
  plan: MergedDataPlan,
  phone: string,
  userId: string
): Promise<DataPurchaseResult> {
  return purchaseData({
    network: plan.network,
    phone,
    planId: plan.id,
    amount: plan.price,
    planName: plan.name,
    userId,
    provider: plan.provider, // Use the provider from the merged plan
  });
}

async function executeDataPurchase(
  provider: Provider,
  params: DataPurchaseParams
): Promise<Omit<DataPurchaseResult, 'provider'>> {
  const reference = generateReference(provider);
  
  if (provider === 'inlomax') {
    const result = await inlomax.purchaseData({
      serviceID: params.planId,
      phone: params.phone,
    });
    
    return {
      success: result.status === 'success',
      reference: result.data?.reference || reference,
      message: result.message,
      amount: params.amount,
      planName: params.planName,
    };
  } else {
    const result = await smeplug.purchaseData({
      network: params.network,
      planId: params.planId,
      phone: params.phone,
      reference,
    });
    
    return {
      success: result.status === true,
      reference: result.reference || reference,
      message: result.message || 'Data purchase successful',
      amount: params.amount,
      planName: params.planName,
    };
  }
}

// ============ BANK TRANSFER (SMEPlug only) ============
export interface BankTransferParams {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  userId: string;
}

export interface BankTransferResult {
  success: boolean;
  provider: Provider;
  reference: string;
  message: string;
  amount: number;
}

export async function bankTransfer(
  params: BankTransferParams
): Promise<BankTransferResult> {
  const reference = generateReference('smeplug');
  const startTime = Date.now();
  
  try {
    const result = await smeplug.bankTransfer({
      bankCode: params.bankCode,
      accountNumber: params.accountNumber,
      amount: params.amount,
      description: `Withdrawal to ${params.accountName}`,
      reference,
    });
    
    updateProviderHealth('smeplug', true, Date.now() - startTime);
    
    return {
      success: result.status === true,
      provider: 'smeplug',
      reference: result.reference || result.customer_reference || reference,
      message: result.message || 'Transfer initiated successfully',
      amount: params.amount,
    };
  } catch (error) {
    updateProviderHealth('smeplug', false, Date.now() - startTime);
    throw error;
  }
}

// ============ ACCOUNT VERIFICATION ============
export async function verifyBankAccount(bankCode: string, accountNumber: string) {
  return smeplug.verifyBankAccount({ bankCode, accountNumber });
}

// ============ GET BANKS LIST ============
export async function getBanksList() {
  return smeplug.getBanks();
}

// ============ UTILITIES ============
function generateReference(provider: Provider): string {
  const prefix = provider === 'inlomax' ? 'INL' : 'SMP';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`.toUpperCase();
}

// Get current provider health status
export function getProviderStatus(): Record<Provider, ProviderHealth> {
  return { ...providerHealth };
}

// Force health check reset (for admin use)
export function resetProviderHealth(provider: Provider) {
  providerHealth[provider] = {
    provider,
    isHealthy: true,
    lastCheck: Date.now(),
    successRate: 100,
    avgResponseTime: 0,
    failureCount: 0,
  };
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
