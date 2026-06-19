import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createSupabaseClient(url, serviceKey);
}

// GET - list contacts
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
    .from('tada_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ status: false, message: 'Failed to fetch contacts' }, { status: 500 });
  return NextResponse.json({ status: true, data });
}

// POST - create contact
export async function POST(request: NextRequest) {
  const supabaseClient = await createClient();
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { userId, name, phone, network } = await request.json();

  // Security check: Verify userId matches authenticated user
  if (userId !== user.id) {
    return NextResponse.json({ status: false, message: 'Unauthorized: User ID mismatch' }, { status: 401 });
  }

  if (!userId || !name || !phone) {
    return NextResponse.json({ status: false, message: 'userId, name and phone are required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('tada_contacts')
    .insert({ user_id: userId, name, phone, network: network || null })
    .select()
    .single();

  if (error) return NextResponse.json({ status: false, message: 'Failed to save contact' }, { status: 500 });
  return NextResponse.json({ status: true, data });
}

// DELETE - remove contact
export async function DELETE(request: NextRequest) {
  const supabaseClient = await createClient();
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('id');
  const userId = searchParams.get('userId');

  // Security check: Verify userId matches authenticated user
  if (userId !== user.id) {
    return NextResponse.json({ status: false, message: 'Unauthorized: User ID mismatch' }, { status: 401 });
  }

  if (!contactId || !userId) return NextResponse.json({ status: false, message: 'id and userId required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('tada_contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ status: false, message: 'Failed to delete contact' }, { status: 500 });
  return NextResponse.json({ status: true });
}
