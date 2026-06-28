// TADAPAY Agent Order Status Endpoint
// Retrieves current status of an order

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { agentSuccess, agentError } from '@/lib/agent-utils';

async function handlerWithParams(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        agentError('User ID is required', 'MISSING_USER_ID'),
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
      network: string | null;
      status: string;
      reference: string;
      external_reference: string | null;
      description: string | null;
      created_at: string;
      updated_at: string;
    };

    const { data: order, error: orderError } = await supabase
      .from('transactions')
      .select(
        'id, user_id, type, amount, phone_number, network, status, reference, external_reference, description, created_at, updated_at'
      )
      .eq('id', orderId)
      .eq('user_id', userId)
      .single<OrderData>();

    if (orderError || !order) {
      console.error('[AGENT ORDER STATUS] Order not found:', orderError);
      return NextResponse.json(
        agentError('Order not found', 'ORDER_NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      agentSuccess({
        orderId: order.id,
        status: order.status,
        reference: order.reference,
        externalReference: order.external_reference,
        amount: Math.abs(order.amount),
        network: order.network,
        phone: order.phone_number,
        description: order.description,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[AGENT ORDER STATUS] Unexpected error:', error);
    return NextResponse.json(
      agentError('An unexpected error occurred', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  const authResult = await withAgentAuth(async (req) => {
    return handlerWithParams(req, { params });
  })(request);

  return authResult;
}
