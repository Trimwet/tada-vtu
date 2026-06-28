import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function isAuthorized(req: NextRequest): boolean {
  // Accept admin JWT token OR CORE_SECRET header (for internal use)
  const auth = req.headers.get('authorization') ?? '';
  if (auth.startsWith('Bearer ')) {
    const { valid } = verifyToken(auth.slice(7));
    if (valid) return true;
  }
  const secret = req.headers.get('x-core-secret');
  if (secret && secret === process.env.CORE_SECRET) return true;
  return false;
}

// GET /api/admin/bot-mode  → { mode: 'ai' | 'menu' }
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('bot_config')
    .select('mode')
    .eq('id', 'default')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mode: data?.mode ?? 'ai' });
}

// POST /api/admin/bot-mode  body: { mode: 'ai' | 'menu' }  → { mode }
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { mode } = body;
  if (mode !== 'ai' && mode !== 'menu') {
    return NextResponse.json({ error: 'mode must be "ai" or "menu"' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('bot_config')
    .upsert({ id: 'default', mode, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[admin] bot mode switched to: ${mode}`);
  return NextResponse.json({ mode });
}
