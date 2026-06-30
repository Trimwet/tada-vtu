import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('release_expired_holds');

    if (error) {
      console.error('[CRON/release-holds] RPC error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const releasedCount = data as number;
    console.log(`[CRON/release-holds] Released ${releasedCount} expired holds`);
    return NextResponse.json({ success: true, released: releasedCount });
  } catch (err) {
    console.error('[CRON/release-holds] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}
