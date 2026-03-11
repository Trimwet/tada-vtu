import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;

    if (!reference) {
      return NextResponse.json(
        { status: false, message: 'Reference parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', reference)
      .single();

    if (error || !transaction) {
      return NextResponse.json(
        { status: false, message: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: true,
      data: {
        reference: transaction.reference,
        status: transaction.status,
        type: transaction.type,
        amount: Math.abs(transaction.amount),
        phone: transaction.phone_number,
        network: transaction.network,
        externalReference: transaction.external_reference,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at,
      },
    });
  } catch (error) {
    console.error('[TRANSACTION] Error:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}
