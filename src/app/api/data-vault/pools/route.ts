import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { title, targetAmount, description, vaultId } = await request.json();

    const { data, error } = await (supabase as any)
      .from('vault_pools')
      .insert({
        title,
        target_amount: targetAmount,
        description,
        vault_id: vaultId,
        organizer_id: user.id,
        status: 'open',
        contributors: []
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: true, data });
  } catch (error) {
    return NextResponse.json({ status: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const poolId = searchParams.get('id');
  const supabase = await createClient();

  if (poolId) {
    const { data, error } = await (supabase as any)
      .from('vault_pools')
      .select('*, organizer:profiles(full_name)')
      .eq('id', poolId)
      .single();
    return NextResponse.json({ status: !error, data });
  }

  const { data, error } = await (supabase as any)
    .from('vault_pools')
    .select('*, organizer:profiles(full_name)')
    .eq('status', 'open');
  
  return NextResponse.json({ status: !error, data });
}
