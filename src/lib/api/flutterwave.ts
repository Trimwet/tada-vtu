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

// Calculate TADA platform fee using tiered structure
// Psychology: ₦29/₦49/₦99/₦149 feel cheaper than round numbers
export function calculateServiceCharge(amount: number): number {
  if (amount < 1000) return 29;        // ₦100 - ₦999: ₦29
  if (amount < 5000) return 29;        // ₦1,000 - ₦4,999: ₦29
  if (amount < 10000) return 49;       // ₦5,000 - ₦9,999: ₦49
  if (amount < 50000) return 99;       // ₦10,000 - ₦49,999: ₦99
  return 149;                          // ₦50,000+: ₦149
}

// Fee tier breakdown for display purposes
export function getFeeTier(amount: number): { fee: number; tier: string } {
  if (amount < 1000) return { fee: 29, tier: '₦100 - ₦999' };
  if (amount < 5000) return { fee: 29, tier: '₦1,000 - ₦4,999' };
  if (amount < 10000) return { fee: 49, tier: '₦5,000 - ₦9,999' };
  if (amount < 50000) return { fee: 99, tier: '₦10,000 - ₦49,999' };
  return { fee: 149, tier: '₦50,000+' };
}

// Calculate Flutterwave processing fee
// Nigeria NGN: 1.4% (cards), but bank transfers via virtual accounts often result in ~2% total cost to customer
export function calculateFlutterwaveFee(amount: number): number {
  const fee = Math.ceil(amount * 0.02); // 2% based on user report
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
    // Card, Bank Transfer, and USSD only
    // Note: "bank" (direct debit) removed due to Flutterwave fingerprint API issues
    payment_options: 'card,banktransfer,ussd',
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

// ============ BANK TRANSFER DEPOSIT FEE ============
// TADA platform fee for bank transfer deposits
// Hybrid fee structure:
// - ₦100 - ₦4,999: Flat ₦30 fee
// - ₦5,000+: 2.5% fee
export const BANK_TRANSFER_FEE_FLAT = 30;
export const BANK_TRANSFER_FEE_PERCENTAGE = 0.025; // 2.5%
export const BANK_TRANSFER_FEE_THRESHOLD = 5000;

// Legacy export for backward compatibility
export const BANK_TRANSFER_FEE = BANK_TRANSFER_FEE_FLAT;

// Calculate bank transfer fee based on amount
export function calculateBankTransferFee(amount: number): number {
  if (amount < BANK_TRANSFER_FEE_THRESHOLD) {
    return BANK_TRANSFER_FEE_FLAT; // ₦30 flat fee for amounts under ₦5,000
  }
  return Math.ceil(amount * BANK_TRANSFER_FEE_PERCENTAGE); // 2.5% for ₦5,000+
}

// Get fee tier info for display
export function getBankTransferFeeTier(amount: number): {
  fee: number;
  isFlat: boolean;
  percentage?: number;
  tier: string;
} {
  if (amount < BANK_TRANSFER_FEE_THRESHOLD) {
    return {
      fee: BANK_TRANSFER_FEE_FLAT,
      isFlat: true,
      tier: '₦100 - ₦4,999',
    };
  }
  return {
    fee: Math.ceil(amount * BANK_TRANSFER_FEE_PERCENTAGE),
    isFlat: false,
    percentage: BANK_TRANSFER_FEE_PERCENTAGE * 100,
    tier: '₦5,000+',
  };
}

// Calculate what user should transfer to get desired wallet amount
export function calculateBankTransferTotal(walletAmount: number): {
  walletCredit: number;
  platformFee: number;
  processingFee: number;
  totalToTransfer: number;
  feeType: 'flat' | 'percentage';
} {
  const platformFee = calculateBankTransferFee(walletAmount);
  // We still calculate processing fee for internal tracking
  const processingFee = calculateFlutterwaveFee(walletAmount + platformFee);
  const totalToTransfer = walletAmount + platformFee;

  return {
    walletCredit: walletAmount,
    platformFee,
    processingFee, // This is what TADA pays from the fee
    totalToTransfer,
    feeType: walletAmount < BANK_TRANSFER_FEE_THRESHOLD ? 'flat' : 'percentage',
  };
}

// Calculate wallet credit from transfer amount (reverse calculation)
// For flat fee: walletCredit = transferAmount - 30
// For percentage: walletCredit = transferAmount / 1.025
export function calculateWalletCreditFromTransfer(transferAmount: number): {
  walletCredit: number;
  platformFee: number;
  processingFee: number;
} {
  // First, estimate if this falls into flat or percentage tier
  // If transfer - 30 < 5000, it's flat fee territory
  const estimatedWalletFlat = transferAmount - BANK_TRANSFER_FEE_FLAT;
  
  let walletCredit: number;
  let platformFee: number;
  
  if (estimatedWalletFlat < BANK_TRANSFER_FEE_THRESHOLD) {
    // Flat fee: transferAmount = walletCredit + 30
    walletCredit = Math.max(0, transferAmount - BANK_TRANSFER_FEE_FLAT);
    platformFee = BANK_TRANSFER_FEE_FLAT;
  } else {
    // Percentage fee: transferAmount = walletCredit * 1.025
    walletCredit = Math.floor(transferAmount / (1 + BANK_TRANSFER_FEE_PERCENTAGE));
    platformFee = transferAmount - walletCredit;
  }
  
  const processingFee = calculateFlutterwaveFee(transferAmount);

  return {
    walletCredit,
    platformFee,
    processingFee,
  };
}
