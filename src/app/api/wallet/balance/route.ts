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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { status: false, message: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Profile fetch error:', error);
      return NextResponse.json(
        { status: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: true,
      data: {
        balance: profile.balance || 0,
        currency: 'NGN',
      },
    });
  } catch (error) {
    console.error('[WALLET-BALANCE] Error:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
