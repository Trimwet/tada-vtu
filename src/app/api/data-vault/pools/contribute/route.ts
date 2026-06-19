import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { poolId, amount, name } = await request.json();

    // 1. Check user balance
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as any).balance < amount) {
      return NextResponse.json({ status: false, message: 'Insufficient balance' }, { status: 400 });
    }

    // 2. Start transaction (atomic contribution)
    // For simplicity here, we do individual updates, but in production, use a stored procedure
    
    // Deduct from user
    const { error: deductError } = await (supabase as any).rpc('update_balance', {
      p_user_id: user.id,
      p_amount: -amount
    });

    if (deductError) throw deductError;

    // Update pool
    const { data: pool } = await (supabase as any)
      .from('vault_pools')
      .select('*')
      .eq('id', poolId)
      .single();

    if (!pool) throw new Error('Pool not found');
    const p = pool as any;

    const newContributors = [...(p.contributors || []), { user_id: user.id, amount, name, created_at: new Date() }];
    const newCurrentAmount = (p.current_amount || 0) + amount;

    const { error: poolUpdateError } = await (supabase as any)
      .from('vault_pools')
      .update({
        contributors: newContributors,
        current_amount: newCurrentAmount,
        status: newCurrentAmount >= p.target_amount ? 'completed' : 'open'
      })
      .eq('id', poolId);

    if (poolUpdateError) throw poolUpdateError;

    return NextResponse.json({ status: true, message: 'Contribution successful' });

  } catch (error) {
    console.error('[POOL-CONTRIBUTE] Error:', error);
    return NextResponse.json({ status: false, message: 'Internal server error' }, { status: 500 });
  }
}
