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
    const authHeader = request.headers.get('authorization');
    
    // Security: Require Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: false, message: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify the token with Supabase
    const supabase = getSupabaseAdmin();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !supabaseUser) {
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

    // Security: Ensure user can only access their own balance
    if (requestedUserId !== supabaseUser.id) {
      return NextResponse.json(
        { status: false, message: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', requestedUserId)
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
