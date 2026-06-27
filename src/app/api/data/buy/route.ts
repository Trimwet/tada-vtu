import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseData as purchaseDataInlomax, ServiceUnavailableError } from '@/lib/api/inlomax';
import { coreDebit, coreRefund } from '@/lib/api/core';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

function hashPin(pin: string): string {
  return Buffer.from(pin + 'tada_salt_2024').toString('base64');
}

function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { dataRequestSchema, validateFormData } = await import('@/lib/validation');
    const validation = validateFormData(dataRequestSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { status: false, message: validation.errors?.[0] || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { network, phone, planId, amount, planName, userId, pin } = validation.data!;
    const clientIdempotencyKey: string | undefined = body.idempotencyKey;

    // Auth: same dual-caller model as airtime/buy.
    // Trusted agent callers (Eve, Go Core) pass x-core-secret and skip PIN.
    // Frontend callers must supply a valid PIN.
    const coreSecretHeader = request.headers.get('x-core-secret');
    const expectedCoreSecret = process.env.CORE_SECRET;
    const isTrustedAgent = expectedCoreSecret && coreSecretHeader === expectedCoreSecret;

    const identifier = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = checkRateLimit(`data:${identifier}`, RATE_LIMITS.transaction);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: false, message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const numAmount = amount;
    const supabase = getSupabaseAdmin();

    // PIN verification — skipped for trusted agent callers whose identity was
    // already confirmed by Eve's channel auth (CORE_SECRET + x-tada-user-id).
    // For all other callers (frontend), PIN is mandatory.
    if (!isTrustedAgent) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('pin')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });
      }

      if (!profile.pin) {
        return NextResponse.json(
          { status: false, message: 'Please set up your transaction PIN first' },
          { status: 400 }
        );
      }

      if (!pin) {
        return NextResponse.json({ status: false, message: 'Transaction PIN is required' }, { status: 400 });
      }

      if (!verifyPin(pin, profile.pin)) {
        return NextResponse.json({ status: false, message: 'Incorrect transaction PIN' }, { status: 400 });
      }
    }

    const reference = `TADA_DATA_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const description = `${network} ${planName || 'Data'} - ${phone}`;

    // See airtime/buy/route.ts for the rationale: prefer a client-supplied
    // key that survives retries; otherwise fall back to a short-window
    // fingerprint so accidental double-submits within the same 5-second
    // bucket are deduped by the atomic_debit RPC rather than each minting
    // a fresh `reference` and bypassing idempotency.
    const idempotencyKey: string =
      clientIdempotencyKey ||
      `dedupe:data:${userId}:${network}:${phone}:${planId}:${numAmount}:${Math.floor(Date.now() / 5000)}`;

    // ── Step 1: Atomic debit via Core ────────────────────────────────────────
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId,
        amount: numAmount,
        reference,
        idempotencyKey,
        serviceType: 'data',
        description,
        metadata: { network, phone_number: phone, plan_id: planId, plan_name: planName },
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
      console.error('[DATA] Core debit failed:', debitError);
      return NextResponse.json(
        { status: false, message: 'Failed to process payment. Please try again.' },
        { status: 500 }
      );
    }

    // ── Step 2: Patch transaction metadata ───────────────────────────────────
    await supabase
      .from('transactions')
      .update({ phone_number: phone, network: network.toUpperCase() })
      .eq('reference', reference);

    // ── Step 3: Call provider ─────────────────────────────────────────────────
    try {
      console.log(`[DATA] Processing: ${network} ${planName} (ID: ${planId}) to ${phone}`);
      const result = await purchaseDataInlomax({ serviceID: planId, phone });
      console.log(`[DATA] Response:`, result.status, result.message);

      if (result.status === 'success') {
        await supabase
          .from('transactions')
          .update({ status: 'success', external_reference: result.data?.reference })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
          message: `${planName || 'Data'} sent to ${phone} successfully!`,
          data: {
            reference,
            externalReference: result.data?.reference,
            network,
            phone,
            dataPlan: planName,
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
          message: 'Transaction is processing. You will be notified when complete.',
          data: { reference, status: 'processing' },
        });
      }

      // Provider failed — refund the user
      try {
        await coreRefund({
          userId,
          amount: numAmount,
          reference: `REFUND_${reference}`,
          idempotencyKey: `REFUND_${idempotencyKey}`,
          originalReference: reference,
          description: `Refund: ${description}`,
        });
      } catch (refundError) {
        console.error('[DATA] Refund failed:', refundError);
        return NextResponse.json(
          { status: false, message: 'Data purchase failed, but the refund could not be completed automatically. Support has been alerted.' },
          { status: 502 }
        );
      }

      return NextResponse.json({
        status: false,
        message: result.message || 'Data purchase failed. Please try again.',
      });
    } catch (apiError) {
      console.error('[DATA] Provider error:', apiError);

      try {
        await coreRefund({
          userId,
          amount: numAmount,
          reference: `REFUND_${reference}`,
          idempotencyKey: `REFUND_${idempotencyKey}`,
          originalReference: reference,
          description: `Refund: ${description}`,
        });
      } catch (refundError) {
        console.error('[DATA] Refund failed:', refundError);
        return NextResponse.json(
          { status: false, message: 'Data purchase failed, but the refund could not be completed automatically. Support has been alerted.' },
          { status: 502 }
        );
      }

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
    console.error('[DATA] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
