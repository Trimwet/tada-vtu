import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// SMEPlug Webhook Handler
// Webhook URL: https://tadavtu.com/api/webhooks/smeplug

interface SMEPlugWebhookPayload {
  transaction: {
    status: 'success' | 'failed' | 'pending';
    reference: string;
    customer_reference: string;
    type: string;
    beneficiary: string;
    memo: string;
    response: string;
    price: string;
  };
}

// Verify webhook is from SMEPlug (basic validation)
function verifyWebhook(_request: NextRequest): boolean {
  // SMEPlug sends webhooks from their servers
  // You can add IP whitelist verification here if needed
  // const webhookSecret = process.env.SMEPLUG_WEBHOOK_SECRET;
  // const signature = request.headers.get('x-smeplug-signature');
  // Add signature verification if SMEPlug provides it
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity
    if (!verifyWebhook(request)) {
      console.error('[SMEPLUG WEBHOOK] Invalid webhook signature');
      return NextResponse.json(
        { status: 'error', message: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload: SMEPlugWebhookPayload = await request.json();
    console.log('[SMEPLUG WEBHOOK] Received:', JSON.stringify(payload));

    if (!payload.transaction) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid payload' },
        { status: 400 }
      );
    }

    const { transaction } = payload;
    const supabase = await createClient();

    // Find the transaction by reference
    let txn: { id: string; status: string; user_id: string; amount: number } | null = null;
    
    const { data: existingTxn } = await supabase
      .from('transactions')
      .select('id, status, user_id, amount')
      .eq('reference', transaction.reference)
      .single();

    if (existingTxn) {
      txn = existingTxn as { id: string; status: string; user_id: string; amount: number };
    } else {
      // Try finding by customer_reference
      const { data: txnByCustomerRef } = await supabase
        .from('transactions')
        .select('id, status, user_id, amount')
        .eq('reference', transaction.customer_reference)
        .single();

      if (txnByCustomerRef) {
        txn = txnByCustomerRef as { id: string; status: string; user_id: string; amount: number };
      }
    }

    if (!txn) {
      console.log('[SMEPLUG WEBHOOK] Transaction not found:', transaction.reference);
      return NextResponse.json({ status: 'ok', message: 'Transaction not found' });
    }

    // Only process if status changed
    if (txn.status === transaction.status) {
      return NextResponse.json({ status: 'ok', message: 'No status change' });
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: transaction.status,
        description: transaction.memo || transaction.response,
      } as never)
      .eq('id', txn.id);

    if (updateError) {
      console.error('[SMEPLUG WEBHOOK] Update error:', updateError);
    }

    // If transaction failed, refund the user
    if (transaction.status === 'failed' && txn.status === 'pending') {
      const refundAmount = Math.abs(txn.amount);
      
      // Get current balance
      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', txn.user_id)
        .single();

      if (userData) {
        const currentBalance = (userData as { balance: number }).balance || 0;
        
        await supabase
          .from('users')
          .update({ balance: currentBalance + refundAmount } as never)
          .eq('id', txn.user_id);

        console.log(`[SMEPLUG WEBHOOK] Refunded ₦${refundAmount} to user ${txn.user_id}`);

        // Create refund notification
        await supabase
          .from('notifications')
          .insert({
            user_id: txn.user_id,
            title: 'Transaction Refunded',
            message: `Your transaction of ₦${refundAmount.toLocaleString()} has been refunded due to a failed transfer.`,
            type: 'refund',
          } as never);
      }
    }

    // If transaction succeeded, send success notification
    if (transaction.status === 'success' && txn.status === 'pending') {
      await supabase
        .from('notifications')
        .insert({
          user_id: txn.user_id,
          title: 'Transaction Successful',
          message: transaction.memo || `Your transaction of ₦${Math.abs(txn.amount).toLocaleString()} was successful.`,
          type: 'success',
        } as never);
    }

    return NextResponse.json({ status: 'ok', message: 'Webhook processed' });
  } catch (error) {
    console.error('[SMEPLUG WEBHOOK] Error:', error);
    // Return 200 to prevent retries for parsing errors
    return NextResponse.json({ status: 'error', message: 'Processing error' });
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'SMEPlug webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
