import { NextRequest, NextResponse } from 'next/server';
import { verifyBankAccount } from '@/lib/api/provider-router';

// POST /api/smeplug/verify-account - Verify bank account details
export async function POST(request: NextRequest) {
  try {
    const { bankCode, accountNumber } = await request.json();

    if (!bankCode || !accountNumber) {
      return NextResponse.json(
        { status: 'error', message: 'Bank code and account number are required' },
        { status: 400 }
      );
    }

    // Validate account number format (10 digits for Nigerian banks)
    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { status: 'error', message: 'Account number must be 10 digits' },
        { status: 400 }
      );
    }

    const result = await verifyBankAccount(bankCode, accountNumber);

    if (result.status && result.data && typeof result.data === 'object' && 'account_name' in result.data) {
      return NextResponse.json({
        status: 'success',
        data: {
          accountName: (result.data as any).account_name,
          accountNumber: (result.data as any).account_number,
        },
      });
    }

    return NextResponse.json(
      { status: 'error', message: result.message || 'Account verification failed' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Account verification error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
}
