import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseData as purchaseDataInlomax, ServiceUnavailableError } from '@/lib/api/inlomax';
import { validateResellerApiKey, updateApiKeyUsage } from '@/lib/api/reseller-auth';

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

    // Use the reseller's balance (the user who owns the API key)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', apiKeyRecord.user_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { status: false, message: 'Reseller account not found' },
        { status: 404 }
      );
    }

    const currentBalance = profile.balance || 0;
    if (currentBalance < numAmount) {
      return NextResponse.json(
        { status: false, message: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}` },
        { status: 400 }
      );
    }

    const reference = `TADA_V1_DATA_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create pending transaction FIRST
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: apiKeyRecord.user_id,
        type: 'data',
        amount: -numAmount,
        status: 'pending',
        reference: reference,
        phone_number: targetPhone,
        network: network.toUpperCase(),
        description: `${network} ${planName || 'Data'} - ${targetPhone} (API)`,
      })
      .select()
      .single();

    if (txnError) {
      console.error('Transaction creation error:', txnError);
      return NextResponse.json(
        { status: false, message: 'Failed to initiate transaction. Please try again.' },
        { status: 500 }
      );
    }

    try {
      console.log(`[V1-DATA] Processing: ${network} ${planName} (ID: ${planId}) to ${targetPhone}`);

      const result = await purchaseDataInlomax({ serviceID: planId, phone: targetPhone });

      console.log(`[V1-DATA] Response:`, result.status, result.message);

      if (result.status === 'success') {
        const newBalance = currentBalance - numAmount;

        // Deduct from reseller's wallet
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', apiKeyRecord.user_id);

        if (updateError) {
          console.error('Balance update error:', updateError);
        }

        // Update transaction as success
        await supabase
          .from('transactions')
          .update({
            status: 'success',
            external_reference: result.data?.reference,
          })
          .eq('id', transaction.id);

        // Update API key monthly usage
        await updateApiKeyUsage(apiKeyRecord.id, numAmount);

        return NextResponse.json({
          status: true,
          message: `${planName || 'Data'} sent to ${targetPhone} successfully!`,
          data: {
            reference: transaction.reference,
            externalReference: result.data?.reference,
            network,
            phone: targetPhone,
            dataPlan: planName,
            amount: numAmount,
            newBalance,
          },
        });
      } else if (result.status === 'processing') {
        await supabase
          .from('transactions')
          .update({
            status: 'pending',
            external_reference: result.data?.reference,
          })
          .eq('id', transaction.id);

        return NextResponse.json({
          status: true,
          message: 'Transaction is processing. You will be notified when complete.',
          data: {
            reference: transaction.reference,
            status: 'processing',
          },
        });
      } else {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);

        return NextResponse.json({
          status: false,
          message: result.message || 'Data purchase failed. Please try again.',
        });
      }
    } catch (apiError) {
      console.error('[V1-DATA] API Error:', apiError);

      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      if (apiError instanceof ServiceUnavailableError) {
        return NextResponse.json(
          { status: false, message: 'Service is unavailable. Please try again later.' },
          { status: 503 }
        );
      }

      const errorMessage = apiError instanceof Error ? apiError.message : 'Service temporarily unavailable';
      return NextResponse.json(
        { status: false, message: errorMessage },
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
