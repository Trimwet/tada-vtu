import { NextRequest, NextResponse } from 'next/server';
import { verifyBankAccount } from '@/lib/api/flutterwave';

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  try {
    const { accountNumber, bankCode } = body;

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Account number and bank code are required' },
        { status: 400 }
      );
    }

    // BYPASS: If Flutterwave secret key is missing, allow dev testing
    if (!process.env.FLUTTERWAVE_SECRET_KEY) {
      console.warn('FLUTTERWAVE_SECRET_KEY not set. Bypassing verification.');
      return NextResponse.json({
        accountName: "Verification Bypassed (Dev)",
        accountNumber: accountNumber,
      });
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
      { error: error instanceof Error ? error.message : 'Failed to verify account' },
      { status: 500 }
    );
  }
}
