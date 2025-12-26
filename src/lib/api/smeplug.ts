// SMEPlug API Service
// Documentation: https://smeplug.ng/api/v1
// Base URL: https://smeplug.ng/api/v1

const SMEPLUG_API_URL = 'https://smeplug.ng/api/v1';

// Network ID mapping for SMEPlug
export const SMEPLUG_NETWORK_IDS: Record<string, string> = {
  MTN: '1',
  AIRTEL: '2',
  '9MOBILE': '3',
  GLO: '4',
};

export function getSmeplugNetworkId(network: string): string {
  return SMEPLUG_NETWORK_IDS[network.toUpperCase()] || '1';
}

interface SMEPlugResponse<T = unknown> {
  status: boolean;
  message?: string;
  reference?: string;
  customer_reference?: string;
  data?: T;
  balance?: number;
  networks?: Record<string, string>;
  banks?: Array<{ id: string; name: string; code: string }>;
  transactions?: Array<SMEPlugTransaction>;
  pagination?: {
    current_page: number;
    total_pages: number;
    total_items: number;
  };
}

export interface SMEPlugTransaction {
  reference: string;
  customer_reference: string;
  type: string;
  beneficiary: string;
  amount: string;
  status: string;
  created_at: string;
}

export interface SMEPlugDataPlan {
  id: string;
  name: string;
  price: string;
  telco_price: string;
}

export interface SMEPlugBank {
  id: string;
  name: string;
  code: string;
}

// Patterns that indicate insufficient balance
const INSUFFICIENT_BALANCE_PATTERNS = [
  'insufficient balance',
  'insufficient funds',
  'low balance',
  'not enough balance',
];

function isInsufficientBalanceError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return INSUFFICIENT_BALANCE_PATTERNS.some(pattern => lowerMessage.includes(pattern));
}

export class SMEPlugServiceUnavailableError extends Error {
  constructor() {
    super('SMEPlug service is unavailable. Please try again later.');
    this.name = 'SMEPlugServiceUnavailableError';
  }
}

// Server-side API call (use in API routes only)
export async function smeplugRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  data?: Record<string, unknown>
): Promise<SMEPlugResponse<T>> {
  const apiKey = process.env.SMEPLUG_API_KEY;

  if (!apiKey) {
    throw new Error('SMEPLUG_API_KEY is not configured');
  }

  try {
    console.log(`[SMEPLUG] Request: ${method} ${endpoint}`, data ? JSON.stringify(data) : '');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${SMEPLUG_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: method === 'POST' && data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log(`[SMEPLUG] Response status: ${response.status}, body: ${responseText.substring(0, 500)}`);

    if (!responseText || responseText.trim() === '') {
      console.error('[SMEPLUG] Empty response from server');
      throw new Error('SMEPlug is not responding. Please try again.');
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('[SMEPLUG] Failed to parse response:', responseText);
      throw new Error('Invalid response from SMEPlug.');
    }

    if (!response.ok || result.status === false) {
      // Improved error message fallback
      const errorMessage = result.message || `SMEPlug Error (Status: ${response.status} ${response.statusText})`;

      console.error('[SMEPLUG] Provider error details:', {
        status: response.status,
        statusText: response.statusText,
        result: result
      });

      if (isInsufficientBalanceError(errorMessage)) {
        console.error('[SMEPLUG] Insufficient balance:', errorMessage);
        throw new SMEPlugServiceUnavailableError();
      }

      throw new Error(errorMessage);
    }

    return result;
  } catch (error) {
    if (error instanceof SMEPlugServiceUnavailableError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[SMEPLUG] Request timed out');
      throw new Error('SMEPlug request timed out. Please try again.');
    }

    console.error('[SMEPLUG] API Error:', error);
    throw error;
  }
}

// ============ BALANCE ============
export async function getBalance() {
  const result = await smeplugRequest<never>('/account/balance');
  return { balance: result.balance || 0 };
}

// ============ NETWORKS ============
export async function getNetworks() {
  return smeplugRequest<never>('/networks');
}

// ============ DATA PLANS ============
export async function getDataPlans() {
  return smeplugRequest<Record<string, SMEPlugDataPlan[]>>('/data/plans');
}

// ============ DATA PURCHASE ============
export interface DataPurchaseResult {
  reference: string;
  customer_reference: string;
}

export async function purchaseData(data: {
  network: string;
  planId: string;
  phone: string;
  reference: string;
}) {
  return smeplugRequest<DataPurchaseResult>('/data/purchase', 'POST', {
    network: getSmeplugNetworkId(data.network),
    plan: data.planId,
    phone: data.phone,
    customer_reference: data.reference,
  });
}

// ============ AIRTIME PURCHASE ============
export async function purchaseAirtime(data: {
  network: string;
  amount: number;
  phone: string;
  reference: string;
}) {
  return smeplugRequest<DataPurchaseResult>('/airtime/purchase', 'POST', {
    network: getSmeplugNetworkId(data.network),
    amount: data.amount.toString(),
    phone: data.phone,
    customer_reference: data.reference,
  });
}

// ============ VTU TOPUP ============
export async function vtuTopup(data: {
  network: string;
  amount: number;
  phone: string;
  reference: string;
}) {
  return smeplugRequest<DataPurchaseResult>('/vtu/topup', 'POST', {
    network: getSmeplugNetworkId(data.network),
    amount: data.amount.toString(),
    phone: data.phone,
    customer_reference: data.reference,
  });
}

// ============ BANKS ============
export async function getBanks() {
  const result = await smeplugRequest<never>('/transfer/banks');
  return result.banks || [];
}

// ============ BANK ACCOUNT VERIFICATION ============
// Note: SMEPlug doesn't have account verification endpoint
// Use Flutterwave for verification instead
export interface AccountVerificationResult {
  account_name: string;
  account_number: string;
}

export async function verifyBankAccount(data: {
  bankCode: string;
  accountNumber: string;
}) {
  // This endpoint is not available on SMEPlug
  // Fallback to returning an error - use Flutterwave instead
  return {
    status: false,
    message: 'Account verification not available via SMEPlug. Use Flutterwave.',
    data: null,
  };
}

// ============ BANK TRANSFER ============
export interface BankTransferResult {
  reference: string;
  customer_reference: string;
  status?: string;
}

export async function bankTransfer(data: {
  bankCode: string;
  accountNumber: string;
  amount: number;
  description?: string;
  reference?: string;
}) {
  const customerReference = data.reference || `TADA-${Date.now()}`;
  const description = data.description || 'TADA VTU Withdrawal';

  console.log(`[SMEPLUG] Initiating bank transfer to ${data.accountNumber} with ref ${customerReference}`);

  return smeplugRequest<BankTransferResult>('/transfer/send', 'POST', {
    bank_code: data.bankCode,
    account_number: data.accountNumber,
    amount: data.amount.toString(),
    description: description,
    customer_reference: customerReference,
  });
}

// ============ TRANSACTION HISTORY ============
export async function getTransactions(params?: {
  type?: 'data' | 'airtime' | 'transfer';
  status?: 'success' | 'failed' | 'pending';
  startDate?: string;
  endDate?: string;
  page?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.startDate) queryParams.append('start_date', params.startDate);
  if (params?.endDate) queryParams.append('end_date', params.endDate);
  if (params?.page) queryParams.append('page', params.page.toString());

  const query = queryParams.toString();
  return smeplugRequest<never>(`/transactions${query ? `?${query}` : ''}`);
}
