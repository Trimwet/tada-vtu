import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { webhookMiddleware } from '@/lib/webhook-security';
import { coreRefund } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Signature Verification (graceful bypass in local development if secret is not set)
    let payload;
    if (process.env.INLOMAX_WEBHOOK_SECRET) {
      const verification = await webhookMiddleware(request, 'inlomax');
      if (verification instanceof Response) {
        return verification;
      }
      payload = verification;
    } else {
      console.warn('⚠️ INLOMAX_WEBHOOK_SECRET is not configured. Webhook signature verification bypassed.');
      payload = await request.json();
    }

    console.log('Inlomax Webhook received:', JSON.stringify(payload, null, 2));

    const { 
      transaction_id, // Inlomax reference (corresponds to external_reference in database)
      status,         // 'success' | 'failed' | 'pending'
      type,
      amount,
      phone,
      network,
      message 
    } = payload;

    if (!transaction_id) {
      return NextResponse.json({ status: false, message: 'Missing transaction_id' }, { status: 400 });
    }

    // 2. Query the transaction
    const supabase = getSupabaseAdmin();
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('external_reference', transaction_id)
      .single();

    if (txError || !transaction) {
      console.warn(`[INLOMAX-WEBHOOK] Transaction not found for external_reference: ${transaction_id}`);
      return NextResponse.json({ status: true, message: 'Transaction not found locally' });
    }

    // If transaction is already resolved (not pending), do nothing
    if (transaction.status !== 'pending') {
      console.log(`[INLOMAX-WEBHOOK] Transaction ${transaction.reference} is already resolved: status=${transaction.status}`);
      return NextResponse.json({ status: true, message: 'Transaction already resolved' });
    }

    // 3. Process status update
    switch (status) {
      case 'success':
        // Update local transaction status to success
        await supabase
          .from('transactions')
          .update({ 
            status: 'success',
            response_data: {
              ...transaction.response_data,
              webhook_payload: payload,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', transaction.id);

        // Notify user
        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          type: 'success',
          title: 'Purchase Successful! 🎉',
          message: `Your purchase of ${transaction.description || (transaction.type + ' ₦' + Math.abs(transaction.amount))} was successful.`,
        });

        console.log(`[INLOMAX-WEBHOOK] Transaction ${transaction.reference} updated to success`);
        break;

      case 'failed':
        // Refund atomically via Core (coreRefund)
        console.log(`[INLOMAX-WEBHOOK] Transaction ${transaction.reference} failed. Refunding user ${transaction.user_id}`);
        try {
          await coreRefund({
            userId: transaction.user_id,
            amount: Math.abs(Number(transaction.amount)),
            reference: `REFUND_${transaction.reference}`,
            originalReference: transaction.reference,
            description: `Refund: Failed purchase (${transaction.description || transaction.type})`,
          });
        } catch (refundError) {
          console.error(`[INLOMAX-WEBHOOK] Refund failed for transaction ${transaction.reference}:`, refundError);
          return NextResponse.json(
            { status: false, message: 'Refund processing failed' },
            { status: 500 }
          );
        }
        break;

      case 'pending':
        console.log(`[INLOMAX-WEBHOOK] Transaction ${transaction.reference} is pending`);
        break;

      default:
        console.warn(`[INLOMAX-WEBHOOK] Unknown status: ${status}`);
    }

    return NextResponse.json({ 
      status: true, 
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ 
      status: false, 
      message: 'Webhook processing failed' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ 
    status: true, 
    message: 'Inlomax webhook endpoint is active' 
  });
}
