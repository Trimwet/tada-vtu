// Flutterwave API Service
// Documentation: https://developer.flutterwave.com/docs

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

interface FlutterwaveResponse<T = unknown> {
  status: string;
  message: string;
  data?: T;
}

async function flutterwaveRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  data?: object
): Promise<FlutterwaveResponse<T>> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('FLUTTERWAVE_SECRET_KEY is not configured');
  }

  const response = await fetch(`${FLW_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || `API Error: ${response.statusText}`);
  }

  return result;
}

// ============ PAYMENT INITIATION ============

export interface PaymentPayload {
  tx_ref: string;
  amount: number;
  currency?: string;
  redirect_url: string;
  customer: {
    email: string;
    name?: string;
    phonenumber?: string;
  };
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  meta?: Record<string, unknown>;
  subaccounts?: Array<{
    id: string;
    transaction_charge_type?: string;
    transaction_charge?: number;
  }>;
}

export interface PaymentResponse {
  link: string;
}

// Calculate service charge: minimum ₦20 or 1% of amount
export function calculateServiceCharge(amount: number): number {
  const percentageCharge = Math.ceil(amount * 0.01); // 1%
  return Math.max(20, percentageCharge); // Minimum ₦20
}

export async function initiatePayment(payload: PaymentPayload) {
  return flutterwaveRequest<PaymentResponse>('/payments', 'POST', {
    ...payload,
    currency: payload.currency || 'NGN',
    // pass_charge makes customer pay Flutterwave fees
    payment_options: 'card,banktransfer,ussd',
  });
}

// ============ VERIFY TRANSACTION ============

export interface TransactionData {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  charged_amount: number;
  status: string;
  payment_type: string;
  customer: {
    id: number;
    email: string;
    name: string;
    phone_number: string;
  };
}

export async function verifyTransaction(transactionId: string) {
  return flutterwaveRequest<TransactionData>(
    `/transactions/${transactionId}/verify`,
    'GET'
  );
}

export async function verifyTransactionByRef(txRef: string) {
  return flutterwaveRequest<TransactionData>(
    `/transactions/verify_by_reference?tx_ref=${txRef}`,
    'GET'
  );
}

// ============ VIRTUAL ACCOUNT ============

export interface VirtualAccountPayload {
  email: string;
  is_permanent: boolean;
  bvn?: string;
  tx_ref: string;
  phonenumber?: string;
  firstname?: string;
  lastname?: string;
  narration?: string;
}

export interface VirtualAccountData {
  response_code: string;
  response_message: string;
  order_ref: string;
  account_number: string;
  bank_name: string;
  amount: number;
}

export async function createVirtualAccount(payload: VirtualAccountPayload) {
  return flutterwaveRequest<VirtualAccountData>(
    '/virtual-account-numbers',
    'POST',
    payload
  );
}

// ============ BILLS PAYMENT (Airtime, Data, etc.) ============

export interface BillPaymentPayload {
  country: string;
  customer: string;
  amount: number;
  type: string;
  reference: string;
  biller_name?: string;
}

export async function payBill(payload: BillPaymentPayload) {
  return flutterwaveRequest('/bills', 'POST', payload);
}

export async function getBillCategories() {
  return flutterwaveRequest('/bill-categories', 'GET');
}

export async function validateBillService(
  item_code: string,
  code: string,
  customer: string
) {
  return flutterwaveRequest(
    `/bill-items/${item_code}/validate?code=${code}&customer=${customer}`,
    'GET'
  );
}
