// TADAPAY Agent User Check-Email Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { agentSuccess, agentError } from '@/lib/agent-utils';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        agentError('email is required', 'MISSING_EMAIL'),
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

    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, balance, phone_number, is_active')
      .eq('email', email.toLowerCase())
      .maybeSingle<ProfileData>();

    if (error) {
      console.error('[AGENT CHECK-EMAIL] DB error:', error);
      return NextResponse.json(agentError('Database error', 'DATABASE_ERROR'), { status: 500 });
    }

    if (!user) {
      return NextResponse.json(agentSuccess({ found: false }));
    }

    return NextResponse.json(
      agentSuccess({
        found: true,
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        balance: user.balance || 0,
        phone: user.phone_number,
        isActive: user.is_active,
      })
    );
  } catch (error) {
    console.error('[AGENT CHECK-EMAIL] Unexpected error:', error);
    return NextResponse.json(
      agentError('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withAgentAuth(handler);
