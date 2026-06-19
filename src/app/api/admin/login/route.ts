import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPassword, generateToken } from '@/lib/admin-auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(`admin-login:${ip}`, RATE_LIMITS.auth);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many login attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)) } }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!verifyPassword(password, admin.password_hash)) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    const token = generateToken(admin.id);

    return NextResponse.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
