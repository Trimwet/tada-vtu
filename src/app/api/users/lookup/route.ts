import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// POST - Lookup user by email or phone
export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();

    if (!email && !phone) {
      return NextResponse.json(
        { status: false, message: 'Email or phone required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Build query based on what's provided
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, phone_number')
      .limit(1);

    if (email) {
      query = query.ilike('email', email.trim());
    } else if (phone) {
      // Normalize phone number for lookup
      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
      query = query.or(`phone_number.ilike.%${normalizedPhone}`);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({
        status: true,
        found: false,
        message: 'User not found on TADA VTU',
      });
    }

    // Return limited info for privacy
    return NextResponse.json({
      status: true,
      found: true,
      user: {
        id: data.id,
        name: data.full_name || 'TADA User',
        // Mask email for privacy: j***@gmail.com
        email: data.email ? maskEmail(data.email) : null,
        isTadaUser: true,
      },
    });
  } catch (error) {
    console.error('User lookup error:', error);
    return NextResponse.json(
      { status: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
}
