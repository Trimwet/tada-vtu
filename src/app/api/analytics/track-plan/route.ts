import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service_type, network, plan_id, plan_name, amount } = await request.json();

    if (!service_type || !plan_id) {
      return NextResponse.json({ error: 'service_type and plan_id required' }, { status: 400 });
    }

    const { error: rpcError } = await (supabase.rpc as any)('upsert_plan_preference', {
      p_user_id: user.id,
      p_service_type: service_type,
      p_network: network || null,
      p_plan_id: plan_id,
      p_plan_name: plan_name || null,
      p_amount: amount || null,
    });

    if (rpcError) {
      console.error('Track plan rpc error:', rpcError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track plan error:', error);
    return NextResponse.json({ success: true });
  }
}
