import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction, verifyTransactionByRef } from '@/lib/api/flutterwave';
import { createClient } from '@supabase/supabase-js';
import { processDeposit } from '@/lib/api/deposit-processor';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transaction_id = searchParams.get('transaction_id');
    const tx_ref = searchParams.get('tx_ref');

    if (!transaction_id && !tx_ref) {
      return NextResponse.json(
        { status: 'error', message: 'transaction_id or tx_ref is required' },
        { status: 400 }
      );
    }

    let result;
    if (transaction_id) {
      result = await verifyTransaction(transaction_id);
    } else if (tx_ref) {
      result = await verifyTransactionByRef(tx_ref);
    }

    if (result?.data?.status === 'successful') {
      const supabase = getSupabaseAdmin();
      const txRef = result.data.tx_ref;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = (result.data as any).meta_data || (result.data as any).meta || {};
      const userId = meta.user_id;
      const walletCredit = meta.wallet_credit || meta.original_amount || result.data.amount;
      const serviceCharge = meta.service_charge || 0;
      const flwRef = result.data.flw_ref;

      console.log('Payment verification:', { txRef, flwRef, totalPaid: result.data.amount, walletCredit, serviceCharge, userId });

      if (userId) {
        // processDeposit handles duplicate detection via external_reference (flw_ref)
        // so it's safe to call even if the webhook already processed it
        const depositResult = await processDeposit(supabase, {
          userId,
          amount: result.data.amount,
          walletCredit: Math.max(walletCredit, 0),
          fee: serviceCharge,
          reference: txRef,
          externalReference: flwRef,
          paymentType: result.data.payment_type || 'card',
          description: `Wallet funding via card (₦${serviceCharge} service fee paid)`,
          metadata: { flutterwave_ref: flwRef, service_charge: serviceCharge, total_paid: result.data.amount }
        });

        if (depositResult.alreadyProcessed) {
          console.log('Verify: deposit already processed by webhook, returning success');
        }
      }

      return NextResponse.json({
        status: 'success',
        message: 'Transaction verified and wallet credited',
        data: {
          amount: walletCredit,
          total_paid: result.data.amount,
          service_charge: serviceCharge,
          currency: result.data.currency,
          tx_ref: txRef,
          flw_ref: flwRef,
          status: result.data.status,
          customer: result.data.customer,
        },
      });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Transaction not successful',
      data: result?.data,
    });
  } catch (error) {
    console.error('Flutterwave verify error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
}
