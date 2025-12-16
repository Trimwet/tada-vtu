import { NextRequest, NextResponse } from 'next/server';
import { initiatePayment, calculateServiceCharge } from '@/lib/api/flutterwave';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, email, name, phone, redirect_url, meta } = body;

    // Rate limiting by email or IP
    const identifier = email || request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = checkRateLimit(`payment:${identifier}`, RATE_LIMITS.transaction);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: 'error', message: `Too many payment attempts. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
        { status: 429 }
      );
    }

    if (!amount || !email) {
      return NextResponse.json(
        { status: 'error', message: 'Amount and email are required' },
        { status: 400 }
      );
    }

    if (amount < 100) {
      return NextResponse.json(
        { status: 'error', message: 'Minimum amount is ₦100' },
        { status: 400 }
      );
    }

    // Simple fee structure - just our service fee
    const walletCredit = amount;
    const serviceFee = calculateServiceCharge(amount);
    const totalToPay = walletCredit + serviceFee;

    const tx_ref = 'TADA_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    console.log('Initiating payment:', { 
      walletCredit,
      serviceFee,
      totalToPay,
      tx_ref 
    });

    const result = await initiatePayment({
      tx_ref,
      amount: totalToPay,
      redirect_url: redirect_url || `${process.env.NEXTAUTH_URL}/dashboard/fund-wallet?status=success`,
      customer: {
        email,
        name,
        phonenumber: phone,
      },
      customizations: {
        title: 'TADA VTU',
        description: `Fund wallet ₦${walletCredit.toLocaleString()}`,
        logo: 'https://tadavtu.com/logo.png',
      },
      meta: {
        ...meta,
        tx_ref,
        original_amount: walletCredit,
        service_charge: serviceFee,
        wallet_credit: walletCredit,
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Payment initiated',
      data: {
        link: result.data?.link,
        tx_ref,
        wallet_credit: walletCredit,
        service_fee: serviceFee,
        total_amount: totalToPay,
      },
    });
  } catch (error) {
    console.error('Flutterwave initiate error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Payment initiation failed',
      },
      { status: 500 }
    );
  }
}
