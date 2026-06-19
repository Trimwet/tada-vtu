import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateResellerApiKey } from '@/lib/api/reseller-auth';
import { coreBalance } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    // API Key authentication
    const apiKey = request.headers.get('x-api-key');
    const apiSecret = request.headers.get('x-api-secret');

    const validation = await validateResellerApiKey(apiKey || '', apiSecret || '');

    if (!validation.valid) {
      return NextResponse.json(
        { status: false, message: validation.error },
        { status: validation.statusCode || 401 }
      );
    }

    const apiKeyRecord = validation.apiKey!;
    const supabase = getSupabaseAdmin();

    // ── Balance: served by Core (single source of truth) ───────────────────
    const balanceResult = await coreBalance(apiKeyRecord.user_id);

    // API key usage info still comes from Supabase
    const { data: apiKeyData } = await supabase
      .from('reseller_api_keys')
      .select('monthly_limit, monthly_usage')
      .eq('id', apiKeyRecord.id)
      .single();

    return NextResponse.json({
      status: true,
      data: {
        balance: balanceResult.balance,
        currency: 'NGN',
        apiKey: {
          monthlyLimit: apiKeyData?.monthly_limit || 100000,
          monthlyUsage: apiKeyData?.monthly_usage || 0,
          availableLimit: (apiKeyData?.monthly_limit || 100000) - (apiKeyData?.monthly_usage || 0),
        },
      },
    });
  } catch (error) {
    console.error('[V1-WALLET-BALANCE] Error:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
