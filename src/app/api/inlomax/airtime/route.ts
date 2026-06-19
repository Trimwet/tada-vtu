import { NextRequest, NextResponse } from 'next/server';
import { purchaseAirtime, ServiceUnavailableError } from '@/lib/api/inlomax';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { coreDebit, coreRefund } from '@/lib/api/core';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { network, phone, amount, userId } = body;

    const identifier = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = checkRateLimit(`airtime:${identifier}`, RATE_LIMITS.transaction);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: false, message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) } }
      );
    }

    if (!userId) return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    if (!network || !phone || !amount) return NextResponse.json({ status: false, message: 'Missing required fields' }, { status: 400 });
    if (!/^0[789][01]\d{8}$/.test(phone)) {
      return NextResponse.json({ status: false, message: 'Invalid phone number. Use format: 08012345678' }, { status: 400 });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 50 || numAmount > 50000) {
      return NextResponse.json({ status: false, message: 'Amount must be between ₦50 and ₦50,000' }, { status: 400 });
    }

    const reference = `AIR_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    let debitResult;
    try {
      debitResult = await coreDebit({
        userId, amount: numAmount, reference,
        serviceType: 'airtime',
        description: `${network} ₦${numAmount} Airtime - ${phone}`,
        metadata: { network, phone },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Debit failed';
      if (msg.startsWith('insufficient funds:')) {
        return NextResponse.json({ status: false, message: 'Insufficient balance.' }, { status: 400 });
      }
      console.error('[AIRTIME/INLOMAX] Core debit error:', err);
      return NextResponse.json({ status: false, message: 'Failed to initiate transaction. Please try again.' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    try {
      console.log(`[AIRTIME/INLOMAX] Processing: ${network} ₦${numAmount} to ${phone}`);
      const result = await purchaseAirtime({ network, phone, amount: numAmount });

      if (result.status === 'success') {
        await supabase.from('transactions')
          .update({ status: 'success', external_reference: result.data?.reference })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
          transactionId: reference,
          message: `₦${numAmount} airtime sent to ${phone} successfully!`,
          data: { reference, externalReference: result.data?.reference, network, phone, amount: numAmount, newBalance: debitResult.newBalance },
        });
      }

      if (result.status === 'processing') {
        await supabase.from('transactions')
          .update({ status: 'pending', external_reference: result.data?.reference })
          .eq('reference', reference);
        return NextResponse.json({
          status: true, processing: true, transactionId: reference,
          message: 'Transaction is processing. You will be notified when complete.',
          data: { reference, status: 'processing' },
        });
      }

      await coreRefund({ userId, amount: numAmount, reference: `REFUND_${reference}`, originalReference: reference, description: `Refund: ${network} airtime failed - ${phone}` });
      return NextResponse.json({ status: false, message: result.message || 'Airtime purchase failed. Your wallet has been refunded.' });

    } catch (apiError) {
      await coreRefund({ userId, amount: numAmount, reference: `REFUND_${reference}`, originalReference: reference, description: `Refund: ${network} airtime error - ${phone}` });
      if (apiError instanceof ServiceUnavailableError) {
        return NextResponse.json({ status: false, message: 'Service is unavailable. Your wallet has been refunded.' }, { status: 503 });
      }
      const errorMessage = apiError instanceof Error ? apiError.message : 'Service temporarily unavailable';
      return NextResponse.json({ status: false, message: `${errorMessage}. Your wallet has been refunded.` }, { status: 500 });
    }

  } catch (error) {
    console.error('[AIRTIME/INLOMAX] Unexpected error:', error);
    return NextResponse.json({ status: false, message: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
