// Inlomax API Service
// Documentation: https://inlomax.com/api-documentation
// Base URL: https://inlomax.com/api

const INLOMAX_API_URL = 'https://inlomax.com/api';

// Airtime Service IDs from Inlomax
export const AIRTIME_SERVICE_IDS: Record<string, string> = {
  MTN: '1',
  AIRTEL: '2',
  GLO: '3',
  '9MOBILE': '4',
};

export function getAirtimeServiceId(network: string): string {
  return AIRTIME_SERVICE_IDS[network.toUpperCase()] || '1';
}

interface InlomaxResponse<T = unknown> {
  status: 'success' | 'processing' | 'failed';
  message: string;
  data?: T;
}

// Patterns that indicate insufficient admin balance on Inlomax
const INSUFFICIENT_BALANCE_PATTERNS = [
  'insufficient balance',
  'insufficient funds',
  'low balance',
  'not enough balance',
  'balance too low',
  'inadequate balance',
  'wallet balance is low',
  'top up your wallet',
  'fund your wallet',
];

// Check if error message indicates insufficient admin balance
function isInsufficientBalanceError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return INSUFFICIENT_BALANCE_PATTERNS.some(pattern => lowerMessage.includes(pattern));
}

// Custom error class for service unavailability
export class ServiceUnavailableError extends Error {
  constructor() {
    super('Service is unavailable. Please try again later.');
    this.name = 'ServiceUnavailableError';
  }
}

// Server-side API call (use in API routes only)
export async function inlomaxRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  data?: Record<string, unknown>
): Promise<InlomaxResponse<T>> {
  const apiKey = process.env.INLOMAX_API_KEY;

  if (!apiKey) {
    throw new Error('INLOMAX_API_KEY is not configured');
  }

  try {
    console.log(`[INLOMAX] Request: ${method} ${endpoint}`, data ? JSON.stringify(data) : '');
    
    // Create AbortController for timeout (60 seconds for data purchases)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch(`${INLOMAX_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${apiKey}`,
      },
      body: method === 'POST' && data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    // Get raw response text first
    const responseText = await response.text();
    console.log(`[INLOMAX] Response status: ${response.status}, body: ${responseText.substring(0, 500)}`);

    // Check for empty response
    if (!responseText || responseText.trim() === '') {
      console.error('[INLOMAX] Empty response from server');
      throw new Error('Service provider is not responding. Please try again in a few minutes.');
    }

    // Try to parse JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[INLOMAX] Failed to parse response:', responseText);
      throw new Error('Invalid response from server. Please try again.');
    }

    if (!response.ok) {
      const errorMessage = result.message || `API Error: ${response.statusText}`;
      
      // Check if this is an insufficient balance error (admin's Inlomax account)
      if (isInsufficientBalanceError(errorMessage)) {
        console.error('[INLOMAX] Admin insufficient balance detected:', errorMessage);
        throw new ServiceUnavailableError();
      }
      
      throw new Error(errorMessage);
    }

    // Also check successful responses that might indicate balance issues
    if (result.status === 'failed' && isInsufficientBalanceError(result.message || '')) {
      console.error('[INLOMAX] Admin insufficient balance detected:', result.message);
      throw new ServiceUnavailableError();
    }

    return result;
  } catch (error) {
    // Re-throw ServiceUnavailableError as-is
    if (error instanceof ServiceUnavailableError) {
      throw error;
    }
    
    // Handle timeout/abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[INLOMAX] Request timed out');
      throw new Error('Request timed out. Please try again.');
    }
    
    console.error('[INLOMAX] API Error:', error);
    throw error;
  }
}


// ============ BALANCE ============
// GET /balance

export interface BalanceData {
  funds: number;
}

export async function getWalletBalance() {
  return inlomaxRequest<BalanceData>('/balance', 'GET');
}

// ============ SERVICES ============
// GET /services - Get all available services and pricing

export interface ServiceAirtime {
  network: string;
  serviceID: string;
  discount: string;
}

export interface ServiceDataPlan {
  serviceID: string;
  network: string;
  dataPlan: string;
  amount: string;
  dataType: string;
  validity: string;
}

export interface ServiceCablePlan {
  serviceID: string;
  cablePlan: string;
  cable: string;
  amount: string;
  discount: string;
}

export interface ServiceElectricity {
  disco: string;
  serviceID: string;
  discount: string;
}

export interface ServicesData {
  airtime: ServiceAirtime[];
  dataPlans: ServiceDataPlan[];
  cablePlans: ServiceCablePlan[];
  electricity: ServiceElectricity[];
  education: Array<{ serviceID: string; type: string; amount: string }>;
  status: string;
}

export async function getServices() {
  return inlomaxRequest<ServicesData>('/services', 'GET');
}

// ============ AIRTIME SERVICES ============
// POST /airtime

export interface AirtimeData {
  type: string;
  reference: string;
  amount: number;
  amountCharged: number;
  phoneNumber: string;
  network: string;
  status: string;
}

export async function purchaseAirtime(data: {
  network: string;
  phone: string;
  amount: number;
}) {
  const serviceID = getAirtimeServiceId(data.network);

  return inlomaxRequest<AirtimeData>('/airtime', 'POST', {
    serviceID,
    amount: data.amount,
    mobileNumber: data.phone,
  });
}


// ============ DATA SERVICES ============
// POST /data

export interface DataPurchaseData {
  type: string;
  reference: string;
  amount: number;
  dataPlan: string;
  dataType: string;
  network: string;
  status: string;
}

export async function purchaseData(data: {
  serviceID: string; // The serviceID from /services endpoint
  phone: string;
}) {
  return inlomaxRequest<DataPurchaseData>('/data', 'POST', {
    serviceID: data.serviceID,
    mobileNumber: data.phone,
  });
}

// ============ CABLE TV SERVICES ============
// POST /validatecable - Validate IUC number
// POST /subcable - Purchase cable subscription

export interface CableValidationData {
  customerName: string;
  currentBouquet: string;
}

export interface CablePurchaseData {
  type: string;
  amount: number;
  reference: string;
  iucNum: string;
  cable: string;
  status: string;
}

export async function validateCable(data: {
  serviceID: string;
  iucNum: string;
}) {
  return inlomaxRequest<CableValidationData>('/validatecable', 'POST', {
    serviceID: data.serviceID,
    iucNum: data.iucNum,
  });
}

export async function purchaseCable(data: {
  serviceID: string;
  iucNum: string;
}) {
  return inlomaxRequest<CablePurchaseData>('/subcable', 'POST', {
    serviceID: data.serviceID,
    iucNum: data.iucNum,
  });
}


// ============ ELECTRICITY SERVICES ============
// POST /validatemeter - Validate meter number
// POST /payelectric - Pay electricity bill

export interface MeterValidationData {
  customerName: string;
}

export interface ElectricityPurchaseData {
  type: string;
  token: string;
  customerName: string;
  amount: number;
  amountCharged: number;
  reference: string;
  meterNum: string;
  disco: string;
  status: string;
}

export async function validateMeter(data: {
  serviceID: string;
  meterNum: string;
  meterType: 1 | 2; // 1=prepaid, 2=postpaid
}) {
  return inlomaxRequest<MeterValidationData>('/validatemeter', 'POST', {
    serviceID: data.serviceID,
    meterNum: data.meterNum,
    meterType: data.meterType,
  });
}

export async function payElectricity(data: {
  serviceID: string;
  meterNum: string;
  meterType: 1 | 2; // 1=prepaid, 2=postpaid
  amount: number;
}) {
  return inlomaxRequest<ElectricityPurchaseData>('/payelectric', 'POST', {
    serviceID: data.serviceID,
    meterNum: data.meterNum,
    meterType: data.meterType,
    amount: data.amount,
  });
}

// ============ TRANSACTION VERIFICATION ============
// POST /transaction

export interface TransactionData {
  type: string;
  reference: string;
  amount: number;
  date: string;
  status: string;
}

export async function getTransaction(reference: string) {
  return inlomaxRequest<TransactionData>('/transaction', 'POST', {
    reference,
  });
}
