import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { coreBalance } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: false, message: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify the user's JWT with Supabase auth — Core doesn't handle user JWTs
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { status: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    if (!requestedUserId) {
      return NextResponse.json(
        { status: false, message: 'userId parameter is required' },
        { status: 400 }
      );
    }

    // Security: only allow users to read their own balance
    if (requestedUserId !== user.id) {
      return NextResponse.json({ status: false, message: 'Unauthorized access' }, { status: 403 });
    }

    // Read balance from Core — this is the authoritative source
    const result = await coreBalance(requestedUserId);

    return NextResponse.json({
      status: true,
      data: {
        balance: result.balance,
        currency: 'NGN',
      },
    });
  } catch (error) {
    console.error('[WALLET-BALANCE] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch balance';
    return NextResponse.json(
      { status: false, message: msg },
      { status: 500 }
    );
  }
}
