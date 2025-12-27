// Flutterwave Transfer/Payout API
// For actual bank withdrawals to Nigerian bank accounts

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

interface FlutterwaveResponse<T = unknown> {
  status: string;
  message: string;
  data?: T;
}

interface TransferData {
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
  meta: Record<string, unknown>;
  narration: string;
  complete_message: string;
  requires_approval: number;
  is_approved: number;
  bank_name: string;
}

interface BankData {
  id: number;
  code: string;
  name: string;
}

interface AccountVerificationData {
  account_number: string;
  account_name: string;
}

// Make authenticated request to Flutterwave
async function flutterwaveRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  data?: Record<string, unknown>
): Promise<FlutterwaveResponse<T>> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('FLUTTERWAVE_SECRET_KEY not configured');
  }

  console.log(`[FLW-TRANSFER] ${method} ${endpoint}`, data ? JSON.stringify(data) : '');

  const response = await fetch(`${FLW_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`,
    },
    body: method === 'POST' && data ? JSON.stringify(data) : undefined,
  });

  const result = await response.json();
  console.log(`[FLW-TRANSFER] Response:`, JSON.stringify(result).substring(0, 500));

  return result;
}

// Get list of Nigerian banks
export async function getBanks(): Promise<BankData[]> {
  const result = await flutterwaveRequest<BankData[]>('/banks/NG');
  
  if (result.status !== 'success' || !result.data) {
    throw new Error(result.message || 'Failed to fetch banks');
  }
  
  return result.data;
}

// Verify bank account details
export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<AccountVerificationData> {
  const result = await flutterwaveRequest<AccountVerificationData>(
    '/accounts/resolve',
    'POST',
    {
      account_number: accountNumber,
      account_bank: bankCode,
    }
  );

  if (result.status !== 'success' || !result.data) {
    throw new Error(result.message || 'Failed to verify account');
  }

  return result.data;
}

// Initiate bank transfer (withdrawal)
export interface TransferParams {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  narration?: string;
  reference?: string;
  userId: string;
}

export interface TransferResult {
  success: boolean;
  reference: string;
  transferId: number;
  status: string;
  message: string;
  fee: number;
  amount: number;
}

export async function initiateTransfer(params: TransferParams): Promise<TransferResult> {
  const reference = params.reference || `TADA-WD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const narration = params.narration || `TADA VTU Withdrawal`;

  try {
    const result = await flutterwaveRequest<TransferData>('/transfers', 'POST', {
      account_bank: params.bankCode,
      account_number: params.accountNumber,
      amount: params.amount,
      narration: narration,
      currency: 'NGN',
      reference: reference,
      callback_url: `${process.env.NEXTAUTH_URL || 'https://www.tadavtu.com'}/api/flutterwave/webhook`,
      debit_currency: 'NGN',
      meta: {
        user_id: params.userId,
        account_name: params.accountName,
        type: 'withdrawal',
      },
    });

    console.log('[FLW-TRANSFER] Full response:', JSON.stringify(result, null, 2));

    if (result.status !== 'success' || !result.data) {
      // Enhanced error handling for common Flutterwave issues
      let errorMessage = result.message || 'Transfer failed';
      
      if (errorMessage.toLowerCase().includes('merchant')) {
        errorMessage = 'Your merchant account needs to be enabled for transfers. Please contact Flutterwave support.';
      } else if (errorMessage.toLowerCase().includes('insufficient')) {
        errorMessage = 'Insufficient balance in merchant account. Please fund your Flutterwave account.';
      } else if (errorMessage.toLowerCase().includes('limit')) {
        errorMessage = 'Transfer amount exceeds your account limits. Please contact support.';
      } else if (errorMessage.toLowerCase().includes('kyc')) {
        errorMessage = 'Your merchant account requires KYC verification. Please complete verification with Flutterwave.';
      }

      return {
        success: false,
        reference: reference,
        transferId: 0,
        status: 'failed',
        message: errorMessage,
        fee: 0,
        amount: params.amount,
      };
    }

    return {
      success: true,
      reference: result.data.reference || reference,
      transferId: result.data.id,
      status: result.data.status,
      message: result.message || 'Transfer initiated',
      fee: result.data.fee || 0,
      amount: result.data.amount,
    };
  } catch (error) {
    console.error('[FLW-TRANSFER] Error:', error);
    return {
      success: false,
      reference: reference,
      transferId: 0,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Network error occurred',
      fee: 0,
      amount: params.amount,
    };
  }
}

// Get transfer status
export async function getTransferStatus(transferId: number): Promise<TransferData | null> {
  const result = await flutterwaveRequest<TransferData>(`/transfers/${transferId}`);
  
  if (result.status !== 'success' || !result.data) {
    return null;
  }
  
  return result.data;
}

// Get transfer fee
export async function getTransferFee(amount: number): Promise<number> {
  const result = await flutterwaveRequest<{ fee: number }[]>(
    `/transfers/fee?amount=${amount}&currency=NGN`
  );
  
  if (result.status !== 'success' || !result.data || result.data.length === 0) {
    // Default fee structure for NGN transfers
    if (amount <= 5000) return 10.75;
    if (amount <= 50000) return 26.88;
    return 53.75;
  }
  
  return result.data[0].fee;
}

// Retry failed transfer
export async function retryTransfer(transferId: number): Promise<TransferResult> {
  const result = await flutterwaveRequest<TransferData>(`/transfers/${transferId}/retries`, 'POST');
  
  if (result.status !== 'success' || !result.data) {
    return {
      success: false,
      reference: '',
      transferId: transferId,
      status: 'failed',
      message: result.message || 'Retry failed',
      fee: 0,
      amount: 0,
    };
  }
  
  return {
    success: true,
    reference: result.data.reference,
    transferId: result.data.id,
    status: result.data.status,
    message: 'Transfer retry initiated',
    fee: result.data.fee,
    amount: result.data.amount,
  };
}
