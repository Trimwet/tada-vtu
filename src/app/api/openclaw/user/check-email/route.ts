import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  openclawSuccess,
  openclawError,
} from '@/lib/openclaw-utils';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        openclawError('Email is required', 'MISSING_EMAIL'),
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    type ProfileData = {
      id: string;
      email: string | null;
      full_name: string | null;
      balance: number;
      phone_number: string | null;
      is_active: boolean;
    };

    // Check if user exists with this email
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, balance, phone_number, is_active')
      .eq('email', email.toLowerCase())
      .maybeSingle<ProfileData>();

    if (error) {
      console.error('Error checking user by email:', error);
      return NextResponse.json(
        openclawError('Database error', 'DATABASE_ERROR'),
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        openclawSuccess({
          found: false
        })
      );
    }

    return NextResponse.json(
      openclawSuccess({
        found: true,
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        balance: user.balance || 0,
        phone: user.phone_number,
        isActive: user.is_active
      })
    );

  } catch (error) {
    console.error('Error in check-email endpoint:', error);
    return NextResponse.json(
      openclawError('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withOpenClawAuth(handler);