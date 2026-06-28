// TADAPAY Agent Transaction History Endpoint
// Returns recent transactions for a user — used by the WhatsApp bot

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { agentSuccess, agentError } from '@/lib/agent-utils';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(1, parseInt(limitParam || '5', 10)), 20);

    if (!userId) {
      return NextResponse.json(
        agentError('userId is required', 'MISSING_USER_ID'),
        { status: 400 }
      );
    }

    const rateLimit = checkRateLimit(
      `agent:transactions:${userId}`,
      RATE_LIMITS.agent
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        agentError(
          `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          'RATE_LIMIT_EXCEEDED'
        ),
        { status: 429 }
      );
    }

    const supabase = createAdminClient();

    type TransactionRow = {
      id: string;
      type: string;
      amount: number;
      status: string;
      description: string | null;
      phone_number: string | null;
      network: string | null;
      reference: string;
      created_at: string;
    };

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(
        'id, type, amount, status, description, phone_number, network, reference, created_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<TransactionRow[]>();

    if (error) {
      console.error('[AGENT TRANSACTIONS] DB error:', error);
      return NextResponse.json(
        agentError('Failed to fetch transactions', 'DATABASE_ERROR'),
        { status: 500 }
      );
    }

    const rows = (transactions || []).map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      description: tx.description,
      phone: tx.phone_number,
      network: tx.network,
      reference: tx.reference,
      date: tx.created_at,
    }));

    return NextResponse.json(
      agentSuccess({
        transactions: rows,
        count: rows.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[AGENT TRANSACTIONS] Unexpected error:', error);
    return NextResponse.json(
      agentError('An unexpected error occurred', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withAgentAuth(handler);
