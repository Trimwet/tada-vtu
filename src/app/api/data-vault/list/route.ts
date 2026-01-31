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
        { status: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get user's vault items
    const { data: vaultItems, error } = await supabase
      .from('data_vault')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Vault items fetch error:', error);
      return NextResponse.json(
        { status: false, message: 'Failed to fetch vault items' },
        { status: 500 }
      );
    }

    // Separate items by status
    const readyItems = vaultItems.filter(item => item.status === 'ready');
    const deliveredItems = vaultItems.filter(item => item.status === 'delivered');
    const expiredItems = vaultItems.filter(item => item.status === 'expired');

    // Calculate totals
    const totalParked = readyItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalDelivered = deliveredItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return NextResponse.json({
      status: true,
      data: {
        ready: readyItems,
        delivered: deliveredItems,
        expired: expiredItems,
        stats: {
          totalParked,
          totalDelivered,
          readyCount: readyItems.length,
          deliveredCount: deliveredItems.length,
          expiredCount: expiredItems.length,
        },
      },
    });

  } catch (error) {
    console.error('[DATA-VAULT] List error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}