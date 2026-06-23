import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseData as purchaseDataInlomax, ServiceUnavailableError } from '@/lib/api/inlomax';
import { validateResellerApiKey, updateApiKeyUsage } from '@/lib/api/reseller-auth';
import { sendTransactionWebhook } from '@/lib/api/webhooks';
import { coreDebit, coreRefund } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    // ── API Key authentication ────────────────────────────────────────────────
    const apiKey    = request.headers.get('x-api-key');
    const apiSecret = request.headers.get('x-api-secret');
    const validation = await validateResellerApiKey(apiKey || '', apiSecret || '');

    if (!validation.valid) {
      return NextResponse.json(
        { status: false, message: validation.error },
        { status: validation.statusCode || 401 }
      );
    }

    const apiKeyRecord = validation.apiKey!;
    const body = await request.json();
    const { network, phone, planId, planName, amount, phone: recipientPhone } = body;
    const targetPhone = phone || recipientPhone;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!network || !targetPhone || !planId || !amount) {
      return NextResponse.json(
        { status: false, message: 'Missing required fields: network, phone, planId, amount' },
        { status: 400 }
      );
    }
    if (!/^0[789][01]\d{8}$/.test(targetPhone)) {
      return NextResponse.json(
        { status: false, message: 'Invalid phone number. Use format: 08012345678' },
        { status: 400 }
      );
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      return NextResponse.json(
        { status: false, message: 'Amount must be at least ₦100' },
        { status: 400 }
      );
    }

    const reference   = `TADA_V1_DATA_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const description = `${network} ${planName || 'Data'} - ${targetPhone} (API)`;

    // ── Step 1: Atomic debit via Core ─────────────────────────────────────────
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId: apiKeyRecord.user_id,
        amount: numAmount,
        reference,
        serviceType: 'data',
        description,
        metadata: { network, phone_number: targetPhone, plan_id: planId, plan_name: planName, source: 'reseller_api' },
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
        return NextResponse.json({ status: false, message: 'Reseller account not found' }, { status: 404 });
      }
      console.error('[V1-DATA] Core debit failed:', debitError);
      return NextResponse.json(
        { status: false, message: 'Failed to initiate transaction. Please try again.' },
        { status: 500 }
      );
    }

    // Patch transaction with reseller-specific columns Core doesn't set
    const supabase = getSupabaseAdmin();
    await supabase
      .from('transactions')
      .update({ phone_number: targetPhone, network: network.toUpperCase() })
      .eq('reference', reference);

    // ── Step 2: Call provider ─────────────────────────────────────────────────
    try {
      console.log(`[V1-DATA] Processing: ${network} ${planName} (ID: ${planId}) to ${targetPhone}`);
      const result = await purchaseDataInlomax({ serviceID: planId, phone: targetPhone });
      console.log(`[V1-DATA] Response:`, result.status, result.message);

      if (result.status === 'success') {
        await supabase
          .from('transactions')
          .update({ status: 'success', external_reference: result.data?.reference })
          .eq('reference', reference);

        await updateApiKeyUsage(apiKeyRecord.id, numAmount);

        sendTransactionWebhook(apiKeyRecord.user_id, {
          reference,
          type: 'data',
          status: 'success',
          network,
          phone: targetPhone,
          amount: numAmount,
          external_reference: result.data?.reference,
        });

        return NextResponse.json({
          status: true,
          message: `${planName || 'Data'} sent to ${targetPhone} successfully!`,
          data: {
            reference,
            externalReference: result.data?.reference,
            network,
            phone: targetPhone,
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

      // Provider returned failure — refund
      await coreRefund({
        userId: apiKeyRecord.user_id,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${description}`,
      }).catch((e) => console.error('[V1-DATA] Refund failed:', e));

      sendTransactionWebhook(apiKeyRecord.user_id, {
        reference,
        type: 'data',
        status: 'failed',
        network,
        phone: targetPhone,
        amount: numAmount,
      });

      return NextResponse.json({
        status: false,
        message: result.message || 'Data purchase failed. Please try again.',
      });

    } catch (apiError) {
      console.error('[V1-DATA] API Error:', apiError);

      await coreRefund({
        userId: apiKeyRecord.user_id,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${description}`,
      }).catch((e) => console.error('[V1-DATA] Refund failed:', e));

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
    console.error('[V1-DATA] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
