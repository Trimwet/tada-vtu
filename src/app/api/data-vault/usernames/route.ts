import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { username, bio, preferredNetworks } = await request.json();

    const { data, error } = await (supabase as any)
      .from('tada_usernames')
      .upsert({
        user_id: user.id,
        username: username.toLowerCase(),
        bio,
        preferred_networks: preferredNetworks,
        created_at: new Date()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ status: false, message: 'Username already taken' }, { status: 400 });
      return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: true, data });
  } catch (error) {
    return NextResponse.json({ status: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const userId = searchParams.get('userId');
  const supabase = await createClient();

  let query = (supabase as any).from('tada_usernames').select('*');
  
  if (username) query = query.eq('username', username.toLowerCase());
  else if (userId) query = query.eq('user_id', userId);
  else return NextResponse.json({ status: false, message: 'Missing parameters' }, { status: 400 });

  const { data, error } = await query.single();
  return NextResponse.json({ status: !error, data });
}
