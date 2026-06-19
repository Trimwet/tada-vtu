import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateCable, purchaseCable, ServiceUnavailableError } from '@/lib/api/inlomax';
import { coreDebit, coreRefund } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serviceID, iucNum, amount, planName, userId } = body;

    const useSandbox = process.env.INLOMAX_SANDBOX !== 'false';

    // ── IUC Verification (no money involved) ───────────────────────────────
    if (action === 'verify') {
      if (!serviceID || !iucNum) {
        return NextResponse.json({ status: false, message: 'Service ID and IUC number required' }, { status: 400 });
      }
      if (useSandbox) {
        return NextResponse.json({
          status: true,
          message: 'IUC verified (sandbox)',
          data: { customerName: 'Test Customer', currentBouquet: 'UNKNOWN' }
        });
      }
      const result = await validateCable({ serviceID, iucNum });
      return NextResponse.json({ status: result.status === 'success', message: result.message, data: result.data });
    }

    // ── Purchase ────────────────────────────────────────────────────────────
    if (!serviceID || !iucNum) {
      return NextResponse.json({ status: false, message: 'Service ID and IUC number required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    }

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      return NextResponse.json({ status: false, message: 'Invalid amount' }, { status: 400 });
    }

    const reference = `CABLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ── Step 1: Debit via Core ──────────────────────────────────────────────
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId, amount: numAmount, reference,
        serviceType: 'cable',
        description: `Cable TV ${planName || serviceID} - ${iucNum}`,
        metadata: { serviceID, iucNum, planName },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Debit failed';
      if (msg.startsWith('insufficient funds:')) {
        return NextResponse.json({ status: false, message: 'Insufficient balance.' }, { status: 400 });
      }
      console.error('[CABLE] Core debit error:', err);
      return NextResponse.json({ status: false, message: 'Failed to create transaction: ' + msg }, { status: 500 });
    }

    // ── Step 2: Call provider ───────────────────────────────────────────────
    const supabase = getSupabaseAdmin();
    try {
      let result;
      if (useSandbox) {
        result = {
          status: 'success' as const,
          message: `Cable subscription successful (sandbox) - ${planName || serviceID}`,
          data: { reference, iucNum, cable: planName, status: 'success' }
        };
      } else {
        result = await purchaseCable({ serviceID, iucNum });
      }

      if (result.status === 'success') {
        await supabase.from('transactions')
          .update({ status: 'success', external_reference: result.data?.reference })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
          message: result.message,
          data: { ...result.data, newBalance: debitResult.newBalance }
        });
      }

      await coreRefund({ userId, amount: numAmount, reference: `REFUND_${reference}`, originalReference: reference, description: `Refund: Cable ${planName || serviceID} failed` });
      return NextResponse.json({ status: false, message: result.message || 'Purchase failed. Your wallet has been refunded.' });

    } catch (apiError) {
      await coreRefund({ userId, amount: numAmount, reference: `REFUND_${reference}`, originalReference: reference, description: `Refund: Cable ${planName || serviceID} error` });
      if (apiError instanceof ServiceUnavailableError) {
        return NextResponse.json({ status: false, message: 'Service is unavailable. Your wallet has been refunded.' }, { status: 503 });
      }
      return NextResponse.json(
        { status: false, message: `${apiError instanceof Error ? apiError.message : 'Purchase failed'}. Your wallet has been refunded.` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Cable purchase error:', error);
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Purchase failed' },
      { status: 500 }
    );
  }
}
