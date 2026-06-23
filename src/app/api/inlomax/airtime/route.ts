import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseAirtime, ServiceUnavailableError } from '@/lib/api/inlomax';
import { coreDebit, coreRefund } from '@/lib/api/core';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

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

    if (!network || !phone || !amount) {
      return NextResponse.json({ status: false, message: 'Missing required fields' }, { status: 400 });
    }

    if (!/^0[789][01]\d{8}$/.test(phone)) {
      return NextResponse.json(
        { status: false, message: 'Invalid phone number. Use format: 08012345678' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 50 || numAmount > 50000) {
      return NextResponse.json(
        { status: false, message: 'Amount must be between ₦50 and ₦50,000' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    }

    const reference = `AIR_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const description = `${network} ₦${numAmount} Airtime - ${phone}`;

    // ── Step 1: Atomic debit via Core ────────────────────────────────────────
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId,
        amount: numAmount,
        reference,
        serviceType: 'airtime',
        description,
        metadata: { network, phone_number: phone },
      });
    } catch (debitError) {
      const msg = debitError instanceof Error ? debitError.message : 'Debit failed';
      if (msg.includes('insufficient funds')) {
        const balanceMatch = msg.match(/balance ([\d.]+)/);
        const bal = balanceMatch ? `₦${Number(balanceMatch[1]).toLocaleString()}` : 'insufficient';
        return NextResponse.json(
          { status: false, message: `Insufficient balance. You have ${bal}` },
          { status: 400 }
        );
      }
      if (msg.includes('profile not found')) {
        return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });
      }
      console.error('[AIRTIME/INLOMAX] Core debit failed:', debitError);
      return NextResponse.json(
        { status: false, message: 'Failed to process payment. Please try again.' },
        { status: 500 }
      );
    }

    // ── Step 2: Patch transaction metadata ───────────────────────────────────
    const supabase = getSupabaseAdmin();
    await supabase
      .from('transactions')
      .update({ phone_number: phone, network: network.toUpperCase() })
      .eq('reference', reference);

    // ── Step 3: Call provider ─────────────────────────────────────────────────
    try {
      console.log(`[AIRTIME/INLOMAX] Calling API: ${network} ₦${numAmount} to ${phone}`);
      const result = await purchaseAirtime({ network, phone, amount: numAmount });
      console.log(`[AIRTIME/INLOMAX] Response:`, result.status, result.message);

      if (result.status === 'success') {
        await supabase
          .from('transactions')
          .update({ status: 'success', external_reference: result.data?.reference, response_data: result })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
          transactionId: reference,
          message: `₦${numAmount} airtime sent to ${phone} successfully!`,
          data: {
            reference,
            externalReference: result.data?.reference,
            network,
            phone,
            amount: numAmount,
            newBalance: debitResult.newBalance,
          },
        });
      }

      if (result.status === 'processing') {
        await supabase
          .from('transactions')
          .update({ external_reference: result.data?.reference })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
          processing: true,
          transactionId: reference,
          message: 'Transaction is processing. You will be notified when complete.',
          data: { reference, status: 'processing' },
        });
      }

      // Provider failed — refund the user
      await coreRefund({
        userId,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${description}`,
      }).catch((e) => console.error('[AIRTIME/INLOMAX] Refund failed:', e));

      return NextResponse.json({
        status: false,
        message: result.message || 'Airtime purchase failed. Please try again.',
      });
    } catch (apiError) {
      console.error('[AIRTIME/INLOMAX] Provider error:', apiError);

      await coreRefund({
        userId,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${description}`,
      }).catch((e) => console.error('[AIRTIME/INLOMAX] Refund failed:', e));

      if (apiError instanceof ServiceUnavailableError) {
        return NextResponse.json(
          { status: false, message: 'Service is unavailable. Please try again later.' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { status: false, message: apiError instanceof Error ? apiError.message : 'Service temporarily unavailable' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[AIRTIME/INLOMAX] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
