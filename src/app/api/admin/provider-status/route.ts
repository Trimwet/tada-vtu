import { NextRequest, NextResponse } from 'next/server';
import { getProviderStatus } from '@/lib/api/provider-router';
import { verifyToken } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { valid, adminId } = verifyToken(authHeader.split(' ')[1]);
    if (!valid || !adminId) {
      return NextResponse.json({ status: 'error', message: 'Invalid or expired token' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (!admin) {
      return NextResponse.json({ status: 'error', message: 'Admin access required' }, { status: 403 });
    }

    const status = getProviderStatus();

    return NextResponse.json({ status: 'success', data: status });
  } catch (error) {
    console.error('Provider status error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to get provider status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { valid, adminId } = verifyToken(authHeader.split(' ')[1]);
    if (!valid || !adminId) {
      return NextResponse.json({ status: 'error', message: 'Invalid or expired token' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (!admin) {
      return NextResponse.json({ status: 'error', message: 'Admin access required' }, { status: 403 });
    }

    const { provider } = await request.json();

    if (!provider || provider !== 'inlomax') {
      return NextResponse.json({ status: 'error', message: 'Invalid provider' }, { status: 400 });
    }

    const { clearPlansCache } = await import('@/lib/api/provider-router');
    clearPlansCache();

    return NextResponse.json({
      status: 'success',
      message: `${provider} cache cleared successfully`,
      data: getProviderStatus(),
    });
  } catch (error) {
    console.error('Provider reset error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to reset provider' }, { status: 500 });
  }
}
