import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  openclawSuccess,
  openclawError,
  normalizeNigerianPhone,
} from '@/lib/openclaw-utils';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        openclawError('Phone number is required', 'MISSING_PHONE'),
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeNigerianPhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        openclawError('Invalid phone number format', 'INVALID_PHONE_FORMAT'),
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    type ProfileData = {
      id: string;
      email: string | null;
      full_name: string | null;
      balance: number;
      whatsapp_number: string | null;
      phone_number: string | null;
      is_active: boolean;
    };

    // Check if user exists with this phone number
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, balance, whatsapp_number, phone_number, is_active')
      .or(`phone_number.eq.${normalizedPhone},whatsapp_number.eq.${normalizedPhone}`)
      .maybeSingle<ProfileData>();

    if (error) {
      console.error('Error checking user by phone:', error);
      return NextResponse.json(
        openclawError('Database error', 'DATABASE_ERROR'),
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        openclawSuccess({
          found: false,
          whatsappLinked: false
        })
      );
    }

    // Check if WhatsApp is already linked
    const whatsappLinked = !!user.whatsapp_number;

    return NextResponse.json(
      openclawSuccess({
        found: true,
        whatsappLinked,
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        balance: user.balance || 0,
        isActive: user.is_active
      })
    );

  } catch (error) {
    console.error('Error in check-phone endpoint:', error);
    return NextResponse.json(
      openclawError('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withOpenClawAuth(handler);