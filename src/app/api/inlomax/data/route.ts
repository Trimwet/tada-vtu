import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { purchaseData, ServiceUnavailableError } from '@/lib/api/inlomax';

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
    const body = await request.json();
    const { network, phone, planId, amount, planName, userId } = body;

    // Validate required fields
    if (!network || !phone || !planId) {
      return NextResponse.json(
        { status: false, message: 'Missing required fields: network, phone, planId' },
        { status: 400 }
      );
    }

    // Validate phone number format (Nigerian format)
    if (!/^0[789][01]\d{8}$/.test(phone)) {
      return NextResponse.json(
        { status: false, message: 'Invalid phone number. Use format: 08012345678' },
        { status: 400 }
      );
    }

    // User must be authenticated
    if (!userId) {
      return NextResponse.json(
        { status: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      return NextResponse.json(
        { status: false, message: 'Invalid amount' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get user profile and balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { status: false, message: 'User not found' },
        { status: 404 }
      );
    }


    // Check balance
    const currentBalance = profile.balance || 0;
    if (currentBalance < numAmount) {
      return NextResponse.json(
        { status: false, message: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = `DATA_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create pending transaction FIRST
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'data',
        amount: -numAmount,
        status: 'pending',
        reference: reference,
        phone_number: phone,
        network: network.toUpperCase(),
        description: `${network} ${planName || 'Data'} - ${phone}`,
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
      // Call Inlomax API - planId is the serviceID
      console.log(`[DATA] Calling Inlomax API: ${network} ${planName} (ID: ${planId}) to ${phone}`);
      const result = await purchaseData({ serviceID: planId, phone });
      console.log(`[DATA] Inlomax response:`, result.status, result.message);

      if (result.status === 'success') {
        const newBalance = currentBalance - numAmount;
        
        // Deduct from wallet
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', userId);

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

        return NextResponse.json({
          status: true,
          message: `${planName || 'Data'} sent to ${phone} successfully!`,
          data: {
            reference: transaction.reference,
            externalReference: result.data?.reference,
            network,
            phone,
            dataPlan: planName,
            amount: numAmount,
            newBalance,
          },
        });
      } else if (result.status === 'processing') {
        // Transaction is processing
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
        // Transaction failed
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
      console.error('[DATA] API Error:', apiError);
      
      // Mark transaction as failed
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      // Handle insufficient admin balance gracefully
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
    console.error('[DATA] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
