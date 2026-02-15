// OpenClaw Transaction History Endpoint
// Returns recent transactions for a user

import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { openclawSuccess, openclawError } from '@/lib/openclaw-utils';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');

    if (!userId) {
      return NextResponse.json(
        openclawError('User ID is required', 'MISSING_USER_ID'),
        { status: 400 }
      );
    }

    // Parse and validate limit
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return NextResponse.json(
        openclawError(
          'Invalid limit. Must be between 1 and 50',
          'INVALID_LIMIT'
        ),
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    type TransactionData = {
      id: string;
      type: string;
      amount: number;
      phone_number: string | null;
      network: string | null;
      status: string;
      reference: string;
      description: string | null;
      created_at: string;
    };

    const { data: transactions, error: txnError } = await supabase
      .from('transactions')
      .select(
        'id, type, amount, phone_number, network, status, reference, description, created_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<TransactionData[]>();

    if (txnError) {
      console.error('[OPENCLAW TRANSACTIONS] Query error:', txnError);
      return NextResponse.json(
        openclawError(
          'Failed to retrieve transactions',
          'DATABASE_ERROR'
        ),
        { status: 500 }
      );
    }

    // Format transactions
    const formattedTransactions = (transactions || []).map((txn) => ({
      id: txn.id,
      type: txn.type,
      amount: Math.abs(txn.amount),
      phone: txn.phone_number,
      network: txn.network,
      status: txn.status,
      reference: txn.reference,
      description: txn.description,
      date: txn.created_at,
    }));

    return NextResponse.json(
      openclawSuccess({
        transactions: formattedTransactions,
        count: formattedTransactions.length,
        limit,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[OPENCLAW TRANSACTIONS] Unexpected error:', error);
    return NextResponse.json(
      openclawError('An unexpected error occurred', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withOpenClawAuth(handler);
