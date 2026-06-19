import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseData as purchaseDataInlomax, ServiceUnavailableError } from '@/lib/api/inlomax';
import { validateResellerApiKey, updateApiKeyUsage } from '@/lib/api/reseller-auth';
import { sendTransactionWebhook } from '@/lib/api/webhooks';
import { coreDebit, coreRefund } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    // API Key authentication
    const apiKey = request.headers.get('x-api-key');
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

    // Use recipientPhone if phone is not provided
    const targetPhone = phone || recipientPhone;

    if (!network || !targetPhone || !planId || !amount) {
      return NextResponse.json(
        { status: false, message: 'Missing required fields: network, phone, planId, amount' },
        { status: 400 }
      );
    }

    // Validate phone number format (Nigerian format)
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

    const supabase = getSupabaseAdmin();

    // Fetch balance for display in error messages only — Core enforces it atomically
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', apiKeyRecord.user_id)
      .single();

    const currentBalance = profile?.balance || 0;

    const reference = `TADA_V1_DATA_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // ── Step 1: Debit wallet via Core ───────────────────────────────────────
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId: apiKeyRecord.user_id,
        amount: numAmount,
        reference,
        serviceType: 'data',
        description: `${network} ${planName || 'Data'} - ${targetPhone} (API)`,
        metadata: { network, phone: targetPhone, planId, planName, source: 'reseller-api' },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Debit failed';
      if (msg.startsWith('insufficient funds:')) {
        return NextResponse.json(
          { status: false, message: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}` },
          { status: 400 }
        );
      }
      console.error('[V1-DATA] Core debit error:', err);
      return NextResponse.json(
        { status: false, message: 'Failed to initiate transaction. Please try again.' },
        { status: 500 }
      );
    }

    // ── Step 2: Call provider ───────────────────────────────────────────────
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
      } else if (result.status === 'processing') {
        await supabase
          .from('transactions')
          .update({ status: 'pending', external_reference: result.data?.reference })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
          message: 'Transaction is processing. You will be notified when complete.',
          data: { reference, status: 'processing' },
        });
      } else {
        // Provider returned failure — refund the reseller
        await coreRefund({
          userId: apiKeyRecord.user_id,
          amount: numAmount,
          reference: `REFUND_${reference}`,
          originalReference: reference,
          description: `Refund: ${network} ${planName || 'data'} failed - ${targetPhone} (API)`,
        });

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
          message: result.message || 'Data purchase failed. Your wallet has been refunded.',
        });
      }
    } catch (apiError) {
      console.error('[V1-DATA] API Error:', apiError);

      await coreRefund({
        userId: apiKeyRecord.user_id,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${network} ${planName || 'data'} error - ${targetPhone} (API)`,
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
    console.error('[V1-DATA] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
