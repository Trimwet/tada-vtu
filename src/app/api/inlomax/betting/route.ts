import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { coreDebit, coreRefund } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

const BETTING_PLATFORMS: Record<string, string> = {
  bet9ja:   'Bet9ja',
  sportybet: 'SportyBet',
  betking:  'BetKing',
  '1xbet':  '1xBet',
  nairabet: 'NairaBet',
  merrybet: 'MerryBet',
  bangbet:  'BangBet',
  msport:   'MSport',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, platform, customerId, amount, userId } = body;

    if (action === 'get_platforms') {
      return NextResponse.json({ status: true, data: Object.entries(BETTING_PLATFORMS).map(([id, name]) => ({ id, name })) });
    }

    if (action === 'verify') {
      if (!platform || !customerId) {
        return NextResponse.json({ status: false, message: 'Platform and customer ID required' }, { status: 400 });
      }
      return NextResponse.json({
        status: true,
        message: 'Customer ID accepted',
        data: { customerName: `${BETTING_PLATFORMS[platform]} User`, customerId, platform }
      });
    }

    // ── Fund betting account ────────────────────────────────────────────────
    if (!platform || !customerId || !amount) {
      return NextResponse.json({ status: false, message: 'Missing required fields' }, { status: 400 });
    }
    if (!BETTING_PLATFORMS[platform]) {
      return NextResponse.json({ status: false, message: 'Invalid betting platform' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 100 || numAmount > 1000000) {
      return NextResponse.json({ status: false, message: 'Amount must be between ₦100 and ₦1,000,000' }, { status: 400 });
    }

    const reference = `BET_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // ── Step 1: Debit via Core ──────────────────────────────────────────────
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId, amount: numAmount, reference,
        serviceType: 'data', // using 'data' as closest serviceType — update when Core adds 'betting'
        description: `${BETTING_PLATFORMS[platform]} Funding - ${customerId}`,
        metadata: { platform, customerId },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Debit failed';
      if (msg.startsWith('insufficient funds:')) {
        return NextResponse.json({ status: false, message: 'Insufficient balance.' }, { status: 400 });
      }
      console.error('[BETTING] Core debit error:', err);
      return NextResponse.json({ status: false, message: 'Failed to initiate transaction' }, { status: 500 });
    }

    // ── Step 2: Call provider ───────────────────────────────────────────────
    // NOTE: Inlomax betting API not yet integrated — placeholder succeeds in sandbox
    const supabase = getSupabaseAdmin();
    try {
      console.log(`[BETTING] Funding ${BETTING_PLATFORMS[platform]} - ${customerId} with ₦${numAmount}`);

      // TODO: replace with actual betting API call when available
      const result = {
        status: 'success' as const,
        message: `${BETTING_PLATFORMS[platform]} account funded successfully`,
        data: { reference, platform: BETTING_PLATFORMS[platform], customerId, amount: numAmount },
      };

      if (result.status === 'success') {
        await supabase.from('transactions')
          .update({ status: 'success' })
          .eq('reference', reference);

        return NextResponse.json({
          status: true,
          message: result.message,
          data: { ...result.data, newBalance: debitResult.newBalance },
        });
      }

      await coreRefund({ userId, amount: numAmount, reference: `REFUND_${reference}`, originalReference: reference, description: `Refund: ${BETTING_PLATFORMS[platform]} funding failed` });
      return NextResponse.json({ status: false, message: 'Betting funding failed. Your wallet has been refunded.' });

    } catch (apiError) {
      console.error('[BETTING] API Error:', apiError);
      await coreRefund({ userId, amount: numAmount, reference: `REFUND_${reference}`, originalReference: reference, description: `Refund: ${BETTING_PLATFORMS[platform]} error` });
      return NextResponse.json({ status: false, message: 'Service temporarily unavailable. Your wallet has been refunded.' }, { status: 500 });
    }

  } catch (error) {
    console.error('[BETTING] Unexpected error:', error);
    return NextResponse.json({ status: false, message: 'An unexpected error occurred' }, { status: 500 });
  }
}
