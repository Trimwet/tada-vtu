// TADAPAY Agent User Check-Phone Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { agentSuccess, agentError, normalizeNigerianPhone } from '@/lib/agent-utils';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        agentError('phone is required', 'MISSING_PHONE'),
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeNigerianPhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        agentError('Invalid phone number format', 'INVALID_PHONE_FORMAT'),
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

    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, balance, whatsapp_number, phone_number, is_active')
      .or(`phone_number.eq.${normalizedPhone},whatsapp_number.eq.${normalizedPhone}`)
      .maybeSingle<ProfileData>();

    if (error) {
      console.error('[AGENT CHECK-PHONE] DB error:', error);
      return NextResponse.json(agentError('Database error', 'DATABASE_ERROR'), { status: 500 });
    }

    if (!user) {
      return NextResponse.json(agentSuccess({ found: false, whatsappLinked: false }));
    }

    return NextResponse.json(
      agentSuccess({
        found: true,
        whatsappLinked: !!user.whatsapp_number,
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        balance: user.balance || 0,
        isActive: user.is_active,
      })
    );
  } catch (error) {
    console.error('[AGENT CHECK-PHONE] Unexpected error:', error);
    return NextResponse.json(
      agentError('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withAgentAuth(handler);
