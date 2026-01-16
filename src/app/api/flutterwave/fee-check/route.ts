import { NextRequest, NextResponse } from 'next/server';
import { 
  calculateServiceCharge, 
  calculateBankTransferFee,
  getBankTransferFeeTier,
  BANK_TRANSFER_FEE_THRESHOLD 
} from '@/lib/api/flutterwave';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = parseInt(searchParams.get('amount') || '0');
    const method = searchParams.get('method') || 'card'; // 'card' or 'bank'

    if (!amount || amount < 100) {
      return NextResponse.json(
        { status: 'error', message: 'Valid amount required' },
        { status: 400 }
      );
    }

    if (method === 'bank') {
      // Bank transfer fee structure
      const bankFee = calculateBankTransferFee(amount);
      const feeTier = getBankTransferFeeTier(amount);
      
      return NextResponse.json({
        status: 'success',
        data: {
          wallet_credit: amount,
          service_fee: bankFee,
          processing_fee: 0,
          total_to_pay: amount + bankFee,
          merchant_pays_fee: false,
          fee_type: feeTier.isFlat ? 'flat' : 'percentage',
          fee_percentage: feeTier.percentage,
          fee_tier: feeTier.tier,
          threshold: BANK_TRANSFER_FEE_THRESHOLD,
        },
      });
    }

    // Card payment fee structure
    const walletCredit = amount;
    const serviceFee = calculateServiceCharge(amount);
    const totalToPay = walletCredit + serviceFee;

    return NextResponse.json({
      status: 'success',
      data: {
        wallet_credit: walletCredit,
        service_fee: serviceFee,
        processing_fee: 0,
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
