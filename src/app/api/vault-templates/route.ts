import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createSupabaseClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  const supabaseClient = await createClient();
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // Security check: Verify userId matches authenticated user
  if (userId !== user.id) {
    return NextResponse.json({ status: false, message: 'Unauthorized: User ID mismatch' }, { status: 401 });
  }

  if (!userId) return NextResponse.json({ status: false, message: 'userId required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('vault_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ status: false, message: 'Failed to fetch templates' }, { status: 500 });
  return NextResponse.json({ status: true, data });
}

export async function POST(request: NextRequest) {
  const supabaseClient = await createClient();
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { userId, name, network, planId, planName, amount, recipientPhone } = await request.json();

  // Security check: Verify userId matches authenticated user
  if (userId !== user.id) {
    return NextResponse.json({ status: false, message: 'Unauthorized: User ID mismatch' }, { status: 401 });
  }

  if (!userId || !name || !network || !planId || !amount) {
    return NextResponse.json({ status: false, message: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('vault_templates')
    .insert({ user_id: userId, name, network, plan_id: planId, plan_name: planName, amount, recipient_phone: recipientPhone || null })
    .select()
    .single();

  if (error) return NextResponse.json({ status: false, message: 'Failed to save template' }, { status: 500 });
  return NextResponse.json({ status: true, data });
}

export async function DELETE(request: NextRequest) {
  const supabaseClient = await createClient();
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('userId');
  const userId = searchParams.get('userId');

  // Security check: Verify userId matches authenticated user
  if (userId !== user.id) {
    return NextResponse.json({ status: false, message: 'Unauthorized: User ID mismatch' }, { status: 401 });
  }

  if (!id || !userId) return NextResponse.json({ status: false, message: 'id and userId required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('vault_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ status: false, message: 'Failed to delete template' }, { status: 500 });
  return NextResponse.json({ status: true });
}
