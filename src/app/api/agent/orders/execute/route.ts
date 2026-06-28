// TADAPAY Agent Order Execution Endpoint
// Executes VTU purchase via Inlomax and manages wallet via Go Core.
//
// Architecture note: this is a 2-step flow.
//   1. /orders/create  — validates + inserts a pending transaction (the "order record")
//   2. /orders/execute — debits wallet, calls provider, updates the order record
//
// Core is called with reference EXEC_{orderId} — a separate debit record — so
// that Core's idempotency check doesn't collide with the order record already
// in the transactions table. The original order record is updated to
// success/failed so the bot can poll it by orderId.

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { agentSuccess, agentError } from '@/lib/agent-utils';
import { purchaseData as purchaseDataInlomax, ServiceUnavailableError } from '@/lib/api/inlomax';
import { coreDebit, coreRefund } from '@/lib/api/core';

interface OrderExecuteRequest {
  orderId: string;
  userId: string;
}

async function handler(request: NextRequest) {
  try {
    const body: OrderExecuteRequest = await request.json();
    const { orderId, userId } = body;

    if (!orderId || !userId) {
      return NextResponse.json(
        agentError('Missing required fields: orderId, userId', 'MISSING_FIELDS'),
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    type OrderData = {
      id: string;
      user_id: string;
      type: string;
      amount: number;
      phone_number: string | null;
      service_id: string | null;
      network: string | null;
      status: string;
      reference: string;
      description: string | null;
    };

    const { data: order, error: orderError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, phone_number, service_id, network, status, reference, description')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single<OrderData>();

    if (orderError || !order) {
      return NextResponse.json(agentError('Order not found', 'ORDER_NOT_FOUND'), { status: 404 });
    }
    if (order.status !== 'pending') {
      return NextResponse.json(
        agentError(`Order already ${order.status}. Cannot execute.`, 'ORDER_ALREADY_PROCESSED'),
        { status: 400 }
      );
    }
    if (order.type !== 'data') {
      return NextResponse.json(
        agentError('Invalid order type. Only data orders are supported.', 'INVALID_ORDER_TYPE'),
        { status: 400 }
      );
    }
    if (!order.phone_number || !order.service_id || !order.network) {
      return NextResponse.json(
        agentError('Order is missing required information', 'INVALID_ORDER_DATA'),
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_active')
      .eq('id', userId)
      .single<{ id: string; is_active: boolean }>();

    if (profileError || !profile) {
      return NextResponse.json(agentError('User not found', 'USER_NOT_FOUND'), { status: 404 });
    }
    if (!profile.is_active) {
      return NextResponse.json(
        agentError('Account is inactive. Please contact support.', 'ACCOUNT_INACTIVE'),
        { status: 403 }
      );
    }

    const purchaseAmount = Math.abs(order.amount);
    const coreRef    = `EXEC_${order.reference}`;
    const description = order.description || `Agent data purchase ${order.reference}`;

    let debitResult;
    try {
      debitResult = await coreDebit({
        userId,
        amount: purchaseAmount,
        reference: coreRef,
        serviceType: 'data',
        description,
        metadata: {
          order_id: orderId,
          order_reference: order.reference,
          phone_number: order.phone_number,
          network: order.network,
          service_id: order.service_id,
          source: 'agent',
        },
      });
    } catch (debitError) {
      const msg = debitError instanceof Error ? debitError.message : '';

      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', orderId);

      if (msg.includes('insufficient funds')) {
        const balanceMatch = msg.match(/balance ([\d.]+)/);
        const bal = balanceMatch ? `₦${Number(balanceMatch[1]).toLocaleString()}` : 'insufficient';
        return NextResponse.json(
          agentError(
            `Insufficient balance. You have ${bal}, need ₦${purchaseAmount.toLocaleString()}`,
            'INSUFFICIENT_BALANCE'
          ),
          { status: 400 }
        );
      }

      console.error('[AGENT EXECUTE] Core debit failed:', debitError);
      return NextResponse.json(
        agentError('Payment processing failed. Please try again.', 'DEBIT_FAILED'),
        { status: 500 }
      );
    }

    try {
      console.log(
        `[AGENT EXECUTE] Calling Inlomax: ${order.network} to ${order.phone_number}, serviceID: ${order.service_id}`
      );
      const result = await purchaseDataInlomax({
        serviceID: order.service_id,
        phone: order.phone_number,
      });
      console.log(`[AGENT EXECUTE] Inlomax response:`, result.status, result.message);

      if (result.status === 'success') {
        await supabase
          .from('transactions')
          .update({ status: 'success', external_reference: result.data?.reference })
          .eq('id', orderId);

        await supabase
          .from('transactions')
          .update({ status: 'success', external_reference: result.data?.reference })
          .eq('reference', coreRef);

        return NextResponse.json(
          agentSuccess({
            status: 'success',
            reference: order.reference,
            externalReference: result.data?.reference,
            newBalance: debitResult.newBalance,
            message: `Data sent to ${order.phone_number} successfully!`,
          }),
          { status: 200 }
        );
      }

      if (result.status === 'processing') {
        await supabase
          .from('transactions')
          .update({ status: 'pending', external_reference: result.data?.reference })
          .eq('id', orderId);

        return NextResponse.json(
          agentSuccess({
            status: 'processing',
            reference: order.reference,
            externalReference: result.data?.reference,
            message: 'Transaction is processing. You will be notified when complete.',
          }),
          { status: 202 }
        );
      }

      await coreRefund({
        userId,
        amount: purchaseAmount,
        reference: `REFUND_${coreRef}`,
        originalReference: coreRef,
        description: `Refund: ${description}`,
      }).catch((e) => console.error('[AGENT EXECUTE] Refund failed:', e));

      await supabase.from('transactions').update({ status: 'failed' }).eq('id', orderId);

      return NextResponse.json(
        agentError(result.message || 'Data purchase failed. Please try again.', 'PURCHASE_FAILED'),
        { status: 400 }
      );

    } catch (apiError) {
      console.error('[AGENT EXECUTE] Provider error:', apiError);

      await coreRefund({
        userId,
        amount: purchaseAmount,
        reference: `REFUND_${coreRef}`,
        originalReference: coreRef,
        description: `Refund: ${description}`,
      }).catch((e) => console.error('[AGENT EXECUTE] Refund failed:', e));

      await supabase.from('transactions').update({ status: 'failed' }).eq('id', orderId);

      if (apiError instanceof ServiceUnavailableError) {
        return NextResponse.json(
          agentError('Service is unavailable. Please try again later.', 'SERVICE_UNAVAILABLE'),
          { status: 503 }
        );
      }

      const errorMessage = apiError instanceof Error ? apiError.message : 'Service temporarily unavailable';
      return NextResponse.json(agentError(errorMessage, 'PURCHASE_FAILED'), { status: 500 });
    }
  } catch (error) {
    console.error('[AGENT EXECUTE] Unexpected error:', error);
    return NextResponse.json(
      agentError('An unexpected error occurred', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const POST = withAgentAuth(handler);
