// TADAPAY Agent Order Status Endpoint
// Poll a pending order by ID — used by the WhatsApp bot after execute

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { agentSuccess, agentError } from '@/lib/agent-utils';

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!orderId) {
      return NextResponse.json(
        agentError('Order ID is required', 'MISSING_ORDER_ID'),
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
      updated_at: string | null;
    };

    let query = supabase
      .from('transactions')
      .select(
        'id, user_id, type, amount, phone_number, network, status, reference, external_reference, description, created_at, updated_at'
      )
      .eq('id', orderId);

    // Scope to user if provided (optional extra guard)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: order, error } = await query.single<OrderData>();

    if (error || !order) {
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
        phone: order.phone_number,
        network: order.network,
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

export const GET = withAgentAuth(
  (request: NextRequest) =>
    handler(request, {
      params: { id: request.url.split('/').at(-1) || '' },
    })
);
