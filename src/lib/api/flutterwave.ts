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
    // Log full error for debugging
    console.error('Flutterwave API Error:', {
      endpoint,
      status: response.status,
      result,
    });
    throw new Error(result.message || `API Error: ${response.statusText}`);
  }

  // Also check for error status in response body (Flutterwave sometimes returns 200 with error)
  if (result.status === 'error') {
    console.error('Flutterwave Error Response:', result);
    throw new Error(result.message || 'Flutterwave request failed');
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

// Calculate service charge: minimum ₦50 or 1% of amount (your platform fee)
export function calculateServiceCharge(amount: number): number {
  const percentageCharge = Math.ceil(amount * 0.01); // 1%
  return Math.max(50, percentageCharge); // Minimum ₦50
}

// Calculate Flutterwave processing fee (approximately 1.4% for cards, capped at ₦2000)
// This ensures customers see the EXACT amount they'll pay - no surprises
export function calculateFlutterwaveFee(amount: number): number {
  const fee = Math.ceil(amount * 0.014); // 1.4%
  return Math.min(fee, 2000); // Flutterwave caps at ₦2000
}

// Calculate total amount customer will pay (wallet amount + service fee + payment processing)
export function calculateTotalPayment(walletAmount: number): {
  walletCredit: number;
  serviceFee: number;
  processingFee: number;
  totalToPay: number;
} {
  const serviceFee = calculateServiceCharge(walletAmount);
  const subtotal = walletAmount + serviceFee;
  const processingFee = calculateFlutterwaveFee(subtotal);
  const totalToPay = subtotal + processingFee;
  
  return {
    walletCredit: walletAmount,
    serviceFee,
    processingFee,
    totalToPay,
  };
}

export async function initiatePayment(payload: PaymentPayload) {
  return flutterwaveRequest<PaymentResponse>('/payments', 'POST', {
    ...payload,
    currency: payload.currency || 'NGN',
    // Bank transfer first (lower fees), then card, then USSD
    payment_options: 'banktransfer,card,ussd',
    // pass_charge: false = merchant pays Flutterwave fee (deducted from settlement)
    // Customer pays exactly what we show them - no surprises!
    pass_charge: false,
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

// ============ TRANSFERS (Withdrawals) ============

export interface BankData {
  id: number;
  code: string;
  name: string;
}

export async function getBanks(country: string = 'NG') {
  return flutterwaveRequest<BankData[]>(`/banks/${country}`, 'GET');
}

export interface AccountVerificationData {
  account_number: string;
  account_name: string;
}

export async function verifyBankAccount(accountNumber: string, bankCode: string) {
  return flutterwaveRequest<AccountVerificationData>('/accounts/resolve', 'POST', {
    account_number: accountNumber,
    account_bank: bankCode,
  });
}

export interface TransferPayload {
  account_bank: string;
  account_number: string;
  amount: number;
  narration: string;
  currency?: string;
  reference: string;
  callback_url?: string;
  debit_currency?: string;
  beneficiary_name?: string;
}

export interface TransferData {
  id: number;
  account_number: string;
  bank_code: string;
  full_name: string;
  created_at: string;
  currency: string;
  debit_currency: string;
  amount: number;
  fee: number;
  status: string;
  reference: string;
  meta: unknown;
  narration: string;
  complete_message: string;
  requires_approval: number;
  is_approved: number;
  bank_name: string;
}

export async function initiateTransfer(payload: TransferPayload) {
  return flutterwaveRequest<TransferData>('/transfers', 'POST', {
    ...payload,
    currency: payload.currency || 'NGN',
    debit_currency: payload.debit_currency || 'NGN',
  });
}

export async function getTransferStatus(transferId: number) {
  return flutterwaveRequest<TransferData>(`/transfers/${transferId}`, 'GET');
}

// Calculate withdrawal fee (Flutterwave charges ₦10.75 for NGN transfers under ₦5000, ₦26.88 for ₦5000+)
// We add a small platform fee on top
export function calculateWithdrawalFee(amount: number): number {
  const flwFee = amount < 5000 ? 10.75 : 26.88;
  const platformFee = 25; // ₦25 platform fee
  return Math.ceil(flwFee + platformFee);
}
