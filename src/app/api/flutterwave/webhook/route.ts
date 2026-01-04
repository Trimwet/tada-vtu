import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BANK_TRANSFER_FEE } from '@/lib/api/flutterwave';

// Force dynamic to prevent caching issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// Log webhook for debugging
async function logWebhook(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  source: string,
  eventType: string,
  payload: unknown,
  status: 'received' | 'processed' | 'failed',
  errorMessage?: string
) {
  try {
    await supabase.from('webhook_logs').insert({
      source,
      event_type: eventType,
      payload: payload as object,
      status,
      error_message: errorMessage || null,
      processed_at: status !== 'received' ? new Date().toISOString() : null
    } as never);
  } catch (e) {
    console.error('Failed to log webhook:', e);
  }
}

// GET endpoint for testing webhook URL accessibility
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Flutterwave webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
import { processDeposit } from '@/lib/api/deposit-processor';

export async function POST(request: NextRequest) {
  // Always return 200 to Flutterwave unless it's a critical infrastructure failure
  const responseOk = NextResponse.json({ status: 'success' });
  const supabase = getSupabaseAdmin();

  try {
    const signature = request.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

    const payload = await request.json();
    const { event, data } = payload;

    // Log all incoming webhooks
    await logWebhook(supabase, 'flutterwave', event, payload, 'received');

    // 1. Signature Verification
    if (secretHash && signature !== secretHash) {
      console.error('❌ Webhook: Invalid signature');
      await logWebhook(supabase, 'flutterwave', event, payload, 'failed', 'Invalid signature');
      return responseOk;
    }

    console.log(`🔔 Webhook received: ${event}`, data?.tx_ref || data?.reference);

    // 2. Handle Deposits (charge.completed)
    if (event === 'charge.completed' && data.status === 'successful') {
      const txRef = data.tx_ref;
      const amount = data.amount;
      const flwRef = data.flw_ref;

      let userId = data.meta?.user_id;

      // Identify user for Bank Transfers
      if (!userId && data.payment_type === 'bank_transfer') {
        const virtualAccountNumber = data.virtual_account_number || data.account_number;
        const customerEmail = data.customer?.email;

        // Lookup by virtual account
        if (virtualAccountNumber) {
          const { data: vaRecord } = await supabase
            .from('virtual_accounts')
            .select('user_id')
            .eq('account_number', virtualAccountNumber)
            .eq('is_active', true)
            .single();
          if (vaRecord) userId = vaRecord.user_id;
        }

        // Fallback 1: Lookup by email if available (highly reliable)
        if (!userId && customerEmail) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customerEmail)
            .single();
          if (profile) userId = profile.id;
        }

        // Fallback 2: Pattern matching on tx_ref
        if (!userId && txRef) {
          if (txRef.startsWith('TADA-VA-') || txRef.startsWith('TADA-TEMP-')) {
            const parts = txRef.split('-');
            const prefix = parts[2];
            // Use like with prefix for UUID column
            const { data: profiles } = await supabase.from('profiles').select('id').filter('id', 'like', `${prefix}%`).limit(1);
            if (profiles?.[0]) userId = profiles[0].id;
          }
        }
      }

      if (!userId) {
        console.error('⚠️ Webhook: Could not identify user', { txRef, flwRef });
        await logWebhook(supabase, 'flutterwave', event, payload, 'failed', 'Could not identify user');
        
        // Store as pending payment for manual review or later verification
        await supabase.from('pending_payments').upsert({
          flutterwave_ref: flwRef,
          tx_ref: txRef,
          amount: amount,
          status: 'pending'
        }, { onConflict: 'flutterwave_ref' });
        
        return responseOk;
      }

      // Calculate credit logic
      const isBankTransfer = data.payment_type === 'bank_transfer';
      const fee = isBankTransfer ? BANK_TRANSFER_FEE : (data.meta?.service_charge || 0);
      const walletCredit = isBankTransfer ? (amount - fee) : (data.meta?.wallet_credit || amount);

      await processDeposit(supabase, {
        userId,
        amount,
        walletCredit: Math.max(walletCredit, 0),
        fee,
        reference: txRef || `FLW-${flwRef}`,
        externalReference: flwRef,
        paymentType: data.payment_type,
        description: isBankTransfer ? `Bank transfer (₦${fee} fee deducted)` : `Wallet funding via ${data.payment_type}`,
        metadata: { ...data.meta, flw_id: data.id }
      });
      
      await logWebhook(supabase, 'flutterwave', event, payload, 'processed');
    }

    // 3. Handle Withdrawals (transfer.completed)
    if (event === 'transfer.completed') {
      const reference = data.reference;
      const status = data.status; // SUCCESSFUL, FAILED

      const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('reference', reference).single();
      if (!withdrawal) return responseOk;

      if (status === 'SUCCESSFUL' && withdrawal.status !== 'success') {
        await supabase.from('withdrawals').update({ status: 'success', completed_at: new Date().toISOString() }).eq('reference', reference);
        await supabase.from('transactions').update({ status: 'success' }).eq('reference', reference);
        await supabase.from('notifications').insert({
          user_id: withdrawal.user_id,
          type: 'success',
          title: 'Withdrawal Successful',
          message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been completed.`,
        });
      } else if (status === 'FAILED' && withdrawal.status !== 'failed') {
        // Refund User
        const totalRefund = Number(withdrawal.amount) + Number(withdrawal.fee || 0);
        await supabase.rpc('update_user_balance', { p_user_id: withdrawal.user_id, p_amount: totalRefund, p_type: 'credit', p_description: `Refund: Withdrawal failed (${reference})` });
        await supabase.from('withdrawals').update({ status: 'failed', failure_reason: data.complete_message || 'Declined' }).eq('reference', reference);
        await supabase.from('transactions').update({ status: 'failed' }).eq('reference', reference);
      }
    }

    return responseOk;

  } catch (error) {
    console.error('❌ Webhook Critical Error:', error);
    try {
      await logWebhook(supabase, 'flutterwave', 'unknown', { error: String(error) }, 'failed', String(error));
    } catch {}
    // Return 200 anyway to prevent Flutterwave disabling the webhook
    return responseOk;
  }
}
