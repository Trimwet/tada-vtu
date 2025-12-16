import { NextRequest, NextResponse } from 'next/server';
import { verifyBankAccount } from '@/lib/api/flutterwave';

export async function POST(request: NextRequest) {
  try {
    const { accountNumber, bankCode } = await request.json();

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Account number and bank code are required' },
        { status: 400 }
      );
    }

    const response = await verifyBankAccount(accountNumber, bankCode);
    
    if (response.status !== 'success' || !response.data) {
      return NextResponse.json(
        { error: 'Could not verify account. Please check the details.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      accountName: response.data.account_name,
      accountNumber: response.data.account_number,
    });
  } catch (error) {
    console.error('Verify account error:', error);
    return NextResponse.json(
      { error: 'Failed to verify account' },
      { status: 500 }
    );
  }
}
