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
    const { network, phone, amount, userId, idempotencyKey: clientIdempotencyKey } = body;

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

    // Auth: this route is called by two types of callers.
    //   1. The Eve agent (or Go Core) — they pass x-core-secret to prove they're trusted.
    //   2. The Next.js frontend — they rely on a Supabase user session, enforced
    //      at the page/middleware level; they don't send x-core-secret.
    // Neither path allows the userId to be fabricated by an anonymous caller:
    //   trusted callers prove it via CORE_SECRET, and frontend callers only
    //   reach this route after Supabase auth middleware validates their session.
    // If neither condition is met, reject.
    const coreSecretHeader = request.headers.get('x-core-secret');
    const expectedCoreSecret = process.env.CORE_SECRET;
    const isTrustedAgent = expectedCoreSecret && coreSecretHeader === expectedCoreSecret;

    // If the caller is not a trusted agent, the userId MUST match a valid
    // Supabase session. We enforce this by checking the Supabase JWT in the
    // Authorization header (set automatically by the Supabase client on the
    // frontend). If neither check passes, reject with 401.
    if (!isTrustedAgent) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { status: false, message: 'Authentication required' },
          { status: 401 }
        );
      }
      // Verify the JWT belongs to the claimed userId
      const token = authHeader.slice(7);
      const supabaseForAuth = getSupabaseAdmin();
      const { data: { user }, error: authError } = await supabaseForAuth.auth.getUser(token);
      if (authError || !user || user.id !== userId) {
        return NextResponse.json(
          { status: false, message: 'Authentication required' },
          { status: 401 }
        );
      }
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

    const reference = `TADA_AIR_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const description = `${network} ₦${numAmount} Airtime - ${phone}`;

    // Idempotency key: prefer a key the client generated once per user action
    // and resends on retry — that's the real fix for double-charges caused by
    // double-taps/retries, and it requires the calling UI to generate and
    // persist this value across retries of the SAME purchase attempt. If the
    // client doesn't send one yet, fall back to a short-window fingerprint of
    // (user, network, phone, amount) so two identical requests arriving
    // within the same 5-second bucket are still treated as the same logical
    // purchase by the atomic_debit RPC, instead of each minting a brand-new
    // `reference` and bypassing idempotency entirely. This is a heuristic
    // safety net, not a substitute for the client sending a real key.
    const idempotencyKey: string =
      clientIdempotencyKey ||
      `dedupe:airtime:${userId}:${network}:${phone}:${numAmount}:${Math.floor(Date.now() / 5000)}`;

    // ── Step 1: Atomic debit via Core ────────────────────────────────────────
    // Core enforces: no overdraft, idempotency, atomic Supabase RPC, pending tx record.
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId,
        amount: numAmount,
        reference,
        idempotencyKey,
        serviceType: 'airtime',
        description,
        metadata: { network, phone_number: phone },
      });
    } catch (debitError) {
      const msg = debitError instanceof Error ? debitError.message : 'Debit failed';
      // 402 from Core = insufficient funds
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
      console.error('[AIRTIME] Core debit failed:', debitError);
      return NextResponse.json(
        { status: false, message: 'Failed to process payment. Please try again.' },
        { status: 500 }
      );
    }

    // ── Step 2: Update transaction metadata (phone, network columns) ──────────
    // Core created the pending transaction — patch extra columns via Supabase.
    const supabase = getSupabaseAdmin();
    await supabase
      .from('transactions')
      .update({ phone_number: phone, network: network.toUpperCase() })
      .eq('reference', reference);

    // ── Step 3: Call provider ─────────────────────────────────────────────────
    try {
      console.log(`[AIRTIME] Processing: ${network} ₦${numAmount} to ${phone}`);
      const result = await purchaseAirtime({ network, phone, amount: numAmount });
      console.log(`[AIRTIME] Response:`, result.status, result.message);

      if (result.status === 'success') {
        await supabase
          .from('transactions')
          .update({ status: 'success', external_reference: result.data?.reference })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
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
          message: 'Transaction is processing. You will be notified when complete.',
          data: { reference, status: 'processing' },
        });
      }

      // Provider returned failure — refund immediately
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
        console.error('[AIRTIME] Refund failed:', refundError);
        return NextResponse.json(
          { status: false, message: 'Airtime purchase failed, but the refund could not be completed automatically. Support has been alerted.' },
          { status: 502 }
        );
      }

      return NextResponse.json({
        status: false,
        message: result.message || 'Airtime purchase failed. Please try again.',
      });
    } catch (apiError) {
      console.error('[AIRTIME] Provider error:', apiError);

      // Provider threw — refund the user
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
        console.error('[AIRTIME] Refund failed:', refundError);
        return NextResponse.json(
          { status: false, message: 'Airtime purchase failed, but the refund could not be completed automatically. Support has been alerted.' },
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
    console.error('[AIRTIME] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
