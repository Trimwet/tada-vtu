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

    // Verify IUC number
    if (action === 'verify') {
      if (!serviceID || !iucNum) {
        return NextResponse.json(
          { status: false, message: 'Service ID and IUC number required' },
          { status: 400 }
        );
      }

      if (useSandbox) {
        return NextResponse.json({
          status: true,
          message: 'IUC verified (sandbox)',
          data: { customerName: 'Test Customer', currentBouquet: 'UNKNOWN' },
        });
      }

      const result = await validateCable({ serviceID, iucNum });
      return NextResponse.json({ status: result.status === 'success', message: result.message, data: result.data });
    }

    // Purchase subscription
    if (!serviceID || !iucNum) {
      return NextResponse.json(
        { status: false, message: 'Service ID and IUC number required' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount) || 0;

    if (!userId || numAmount <= 0) {
      if (useSandbox) {
        return NextResponse.json({
          status: true,
          message: 'Cable subscription successful (sandbox)',
          data: { reference: 'SANDBOX_' + Date.now(), iucNum, cable: planName },
        });
      }
      const result = await purchaseCable({ serviceID, iucNum });
      return NextResponse.json({ status: result.status === 'success', message: result.message, data: result.data });
    }

    const reference = `CABLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const description = `Cable TV ${planName || serviceID} - ${iucNum}`;

    // ── Step 1: Atomic debit via Core ────────────────────────────────────────
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId,
        amount: numAmount,
        reference,
        serviceType: 'cable',
        description,
        metadata: { service_id: serviceID, iuc_num: iucNum, plan_name: planName },
      });
    } catch (debitError) {
      const msg = debitError instanceof Error ? debitError.message : 'Debit failed';
      if (msg.includes('insufficient funds')) {
        return NextResponse.json({ status: false, message: 'Insufficient balance' }, { status: 400 });
      }
      if (msg.includes('profile not found')) {
        return NextResponse.json({ status: false, message: 'User not found' }, { status: 404 });
      }
      console.error('[CABLE] Core debit failed:', debitError);
      return NextResponse.json(
        { status: false, message: 'Failed to create transaction: ' + msg },
        { status: 500 }
      );
    }

    // ── Step 2: Call provider ─────────────────────────────────────────────────
    const supabase = getSupabaseAdmin();
    try {
      let result;
      if (useSandbox) {
        result = {
          status: 'success' as const,
          message: `Cable subscription successful (sandbox) - ${planName || serviceID}`,
          data: { reference, iucNum, cable: planName, status: 'success' },
        };
      } else {
        result = await purchaseCable({ serviceID, iucNum });
      }

      if (result.status === 'success') {
        await supabase
          .from('transactions')
          .update({ status: 'success', external_reference: result.data?.reference })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
          message: result.message,
          data: { ...result.data, newBalance: debitResult.newBalance },
        });
      }

      // Provider returned failure — refund
      await coreRefund({
        userId,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${description}`,
      }).catch((e) => console.error('[CABLE] Refund failed:', e));

      return NextResponse.json({ status: false, message: result.message || 'Purchase failed' });
    } catch (apiError) {
      await coreRefund({
        userId,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${description}`,
      }).catch((e) => console.error('[CABLE] Refund failed:', e));

      if (apiError instanceof ServiceUnavailableError) {
        return NextResponse.json(
          { status: false, message: 'Service is unavailable. Please try again later.' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { status: false, message: apiError instanceof Error ? apiError.message : 'Purchase failed' },
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
