import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseData as purchaseDataInlomax, ServiceUnavailableError } from '@/lib/api/inlomax';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { coreDebit, coreRefund } from '@/lib/api/core';

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

    // ── Rate limit ──────────────────────────────────────────────────────────
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

    // ── PIN verification (stays in Next.js — this is auth, not finance) ────
    // Note: we only fetch `pin` here. Balance enforcement is Core's job.
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

    // ── Generate reference ──────────────────────────────────────────────────
    const reference = `TADA_DATA_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // ── Step 1: Debit wallet via Core ───────────────────────────────────────
    // Core handles: balance check, idempotency, atomic debit, pending txn record.
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId,
        amount: numAmount,
        reference,
        serviceType: 'data',
        description: `${network} ${planName || 'Data'} - ${phone}`,
        metadata: { network, phone, planId, planName },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Debit failed';
      if (msg.startsWith('insufficient funds:')) {
        return NextResponse.json({ status: false, message: 'Insufficient balance.' }, { status: 400 });
      }
      console.error('[DATA] Core debit error:', err);
      return NextResponse.json(
        { status: false, message: 'Failed to initiate transaction. Please try again.' },
        { status: 500 }
      );
    }

    // ── Step 2: Call provider ───────────────────────────────────────────────
    try {
      console.log(`[DATA] Processing: ${network} ${planName} (ID: ${planId}) to ${phone} ref=${reference}`);
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
          .update({ status: 'pending', external_reference: result.data?.reference })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
          message: 'Transaction is processing. You will be notified when complete.',
          data: { reference, status: 'processing' },
        });
      }

      // Provider returned failure — refund the user
      console.warn(`[DATA] Provider failed, refunding: ref=${reference}`);
      await coreRefund({
        userId,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${network} ${planName || 'data'} failed - ${phone}`,
      });

      return NextResponse.json({
        status: false,
        message: result.message || 'Data purchase failed. Your wallet has been refunded.',
      });

    } catch (apiError) {
      console.error('[DATA] Provider error:', apiError);

      // Provider threw — always refund
      await coreRefund({
        userId,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${network} ${planName || 'data'} error - ${phone}`,
      });

      if (apiError instanceof ServiceUnavailableError) {
        return NextResponse.json(
          { status: false, message: 'Service is unavailable. Your wallet has been refunded.' },
          { status: 503 }
        );
      }

      const errorMessage = apiError instanceof Error ? apiError.message : 'Service temporarily unavailable';
      return NextResponse.json(
        { status: false, message: `${errorMessage}. Your wallet has been refunded.` },
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
