import { NextRequest, NextResponse } from 'next/server';
import { calculateServiceCharge } from '@/lib/api/flutterwave';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = parseInt(searchParams.get('amount') || '0');

    if (!amount || amount < 100) {
      return NextResponse.json(
        { status: 'error', message: 'Valid amount required' },
        { status: 400 }
      );
    }

    // Simple fee structure - just our service fee
    // Flutterwave will add their own processing fee at checkout
    const walletCredit = amount;
    const serviceFee = calculateServiceCharge(amount);
    const totalToPay = walletCredit + serviceFee;

    return NextResponse.json({
      status: 'success',
      data: {
        wallet_credit: walletCredit,
        service_fee: serviceFee,
        processing_fee: 0, // Flutterwave handles this at checkout
        total_to_pay: totalToPay,
        merchant_pays_fee: true,
      },
    });
  } catch (error) {
    console.error('Fee check error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to check fees' },
      { status: 500 }
    );
  }
}
