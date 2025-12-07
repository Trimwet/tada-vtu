import { NextRequest, NextResponse } from 'next/server';
import { initiatePayment, calculateServiceCharge } from '@/lib/api/flutterwave';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, email, name, phone, redirect_url, meta } = body;

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

    // Calculate service charge (min ₦20 or 1%)
    const serviceCharge = calculateServiceCharge(amount);
    const totalAmount = amount + serviceCharge;

    const tx_ref = 'TADA_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    console.log('Initiating payment:', { 
      originalAmount: amount, 
      serviceCharge, 
      totalAmount, 
      tx_ref 
    });

    const result = await initiatePayment({
      tx_ref,
      amount: totalAmount, // Customer pays total (amount + service charge)
      redirect_url: redirect_url || `${process.env.NEXTAUTH_URL}/dashboard/fund-wallet?status=success`,
      customer: {
        email,
        name,
        phonenumber: phone,
      },
      customizations: {
        title: 'TADA VTU',
        description: `Fund wallet ₦${amount.toLocaleString()} + ₦${serviceCharge} service fee`,
        logo: 'https://tadavtu.com/logo.png',
      },
      meta: {
        ...meta,
        tx_ref,
        original_amount: amount,
        service_charge: serviceCharge,
        wallet_credit: amount, // Amount to credit to wallet
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Payment initiated',
      data: {
        link: result.data?.link,
        tx_ref,
        original_amount: amount,
        service_charge: serviceCharge,
        total_amount: totalAmount,
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
