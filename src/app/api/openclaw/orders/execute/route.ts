// OpenClaw Order Execution Endpoint
// Executes VTU purchase via Inlomax and deducts wallet balance

import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { openclawSuccess, openclawError } from '@/lib/openclaw-utils';
import {
  purchaseData as purchaseDataInlomax,
  ServiceUnavailableError,
} from '@/lib/api/inlomax';

interface OrderExecuteRequest {
  orderId: string;
  userId: string;
}

async function handler(request: NextRequest) {
  try {
    // Parse request body
    const body: OrderExecuteRequest = await request.json();
    const { orderId, userId } = body;

    // Validate required fields
    if (!orderId || !userId) {
      return NextResponse.json(
        openclawError(
          'Missing required fields: orderId, userId',
          'MISSING_FIELDS'
        ),
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get order details
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
      .select(
        'id, user_id, type, amount, phone_number, service_id, network, status, reference, description'
      )
      .eq('id', orderId)
      .eq('user_id', userId)
      .single<OrderData>();

    if (orderError || !order) {
      console.error('[OPENCLAW ORDER EXECUTE] Order not found:', orderError);
      return NextResponse.json(
        openclawError('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Verify order is pending
    if (order.status !== 'pending') {
      return NextResponse.json(
        openclawError(
          `Order already ${order.status}. Cannot execute.`,
          'ORDER_ALREADY_PROCESSED'
        ),
        { status: 400 }
      );
    }

    // Verify order type is data
    if (order.type !== 'data') {
      return NextResponse.json(
        openclawError(
          'Invalid order type. Only data orders are supported.',
          'INVALID_ORDER_TYPE'
        ),
        { status: 400 }
      );
    }

    // Validate required order fields
    if (!order.phone_number || !order.service_id || !order.network) {
      return NextResponse.json(
        openclawError(
          'Order is missing required information',
          'INVALID_ORDER_DATA'
        ),
        { status: 400 }
      );
    }

    // Get user profile to verify balance again
    type ProfileData = {
      id: string;
      balance: number;
      is_active: boolean;
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, balance, is_active')
      .eq('id', userId)
      .single<ProfileData>();

    if (profileError || !profile) {
      console.error('[OPENCLAW ORDER EXECUTE] Profile error:', profileError);
      return NextResponse.json(
        openclawError('User not found', 'USER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if account is active
    if (!profile.is_active) {
      return NextResponse.json(
        openclawError(
          'Account is inactive. Please contact support.',
          'ACCOUNT_INACTIVE'
        ),
        { status: 403 }
      );
    }

    // Check balance (amount is negative in transaction)
    const purchaseAmount = Math.abs(order.amount);
    const currentBalance = profile.balance || 0;

    if (currentBalance < purchaseAmount) {
      // Mark order as failed
      await (supabase as any)
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', orderId);

      return NextResponse.json(
        openclawError(
          `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, need ₦${purchaseAmount.toLocaleString()}`,
          'INSUFFICIENT_BALANCE'
        ),
        { status: 400 }
      );
    }

    try {
      // Call Inlomax API
      console.log(
        `[OPENCLAW ORDER EXECUTE] Calling Inlomax: ${order.network} to ${order.phone_number}, serviceID: ${order.service_id}`
      );

      const result = await purchaseDataInlomax({
        serviceID: order.service_id,
        phone: order.phone_number,
      });

      console.log(
        `[OPENCLAW ORDER EXECUTE] Inlomax response:`,
        result.status,
        result.message
      );

      if (result.status === 'success') {
        // Deduct from wallet
        const newBalance = currentBalance - purchaseAmount;

        const { error: updateError } = await (supabase as any)
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', userId);

        if (updateError) {
          console.error(
            '[OPENCLAW ORDER EXECUTE] Balance update error:',
            updateError
          );
        }

        // Update transaction as success
        await (supabase as any)
          .from('transactions')
          .update({
            status: 'success',
            external_reference: result.data?.reference,
          })
          .eq('id', orderId);

        return NextResponse.json(
          openclawSuccess({
            status: 'success',
            reference: order.reference,
            externalReference: result.data?.reference,
            newBalance,
            message: `Data sent to ${order.phone_number} successfully!`,
          }),
          { status: 200 }
        );
      } else if (result.status === 'processing') {
        // Transaction is processing
        await (supabase as any)
          .from('transactions')
          .update({
            status: 'pending',
            external_reference: result.data?.reference,
          })
          .eq('id', orderId);

        return NextResponse.json(
          openclawSuccess({
            status: 'processing',
            reference: order.reference,
            externalReference: result.data?.reference,
            message:
              'Transaction is processing. You will be notified when complete.',
          }),
          { status: 202 }
        );
      } else {
        // Transaction failed
        await (supabase as any)
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', orderId);

        return NextResponse.json(
          openclawError(
            result.message || 'Data purchase failed. Please try again.',
            'PURCHASE_FAILED'
          ),
          { status: 400 }
        );
      }
    } catch (apiError) {
      console.error('[OPENCLAW ORDER EXECUTE] API Error:', apiError);

      // Mark transaction as failed
      await (supabase as any)
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', orderId);

      // Handle insufficient admin balance gracefully
      if (apiError instanceof ServiceUnavailableError) {
        return NextResponse.json(
          openclawError(
            'Service is unavailable. Please try again later.',
            'SERVICE_UNAVAILABLE'
          ),
          { status: 503 }
        );
      }

      const errorMessage =
        apiError instanceof Error
          ? apiError.message
          : 'Service temporarily unavailable';

      return NextResponse.json(
        openclawError(errorMessage, 'PURCHASE_FAILED'),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[OPENCLAW ORDER EXECUTE] Unexpected error:', error);
    return NextResponse.json(
      openclawError('An unexpected error occurred', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const POST = withOpenClawAuth(handler);
