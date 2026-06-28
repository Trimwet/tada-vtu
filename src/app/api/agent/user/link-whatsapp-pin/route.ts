// TADAPAY Agent Link WhatsApp via PIN Endpoint
// Verifies email + PIN then writes whatsapp_number to the profile row

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { agentSuccess, agentError, normalizeNigerianPhone } from '@/lib/agent-utils';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function hashPin(pin: string): string {
  return Buffer.from(pin + 'tada_salt_2024').toString('base64');
}

function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, pin } = body as { phone?: string; email?: string; pin?: string };

    if (!phone || !email || !pin) {
      return NextResponse.json(
        agentError('phone, email, and pin are required', 'MISSING_FIELDS'),
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

    // Brute-force rate limit keyed on the email being tested
    const rateLimit = checkRateLimit(`agent:link-pin:${email}`, RATE_LIMITS.auth);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        agentError(
          `Too many attempts. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          'RATE_LIMIT_EXCEEDED'
        ),
        { status: 429 }
      );
    }

    const supabase = createAdminClient();

    type ProfileData = {
      id: string;
      email: string | null;
      full_name: string | null;
      balance: number;
      pin: string | null;
      is_active: boolean;
    };

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name, balance, pin, is_active')
      .eq('email', email.toLowerCase())
      .maybeSingle<ProfileData>();

    if (userError || !user) {
      return NextResponse.json(agentError('User not found', 'USER_NOT_FOUND'), { status: 404 });
    }
    if (!user.is_active) {
      return NextResponse.json(agentError('Account is inactive', 'ACCOUNT_INACTIVE'), { status: 403 });
    }
    if (!user.pin) {
      return NextResponse.json(
        agentError('Please set up your transaction PIN in the TADA app first', 'NO_PIN_SET'),
        { status: 400 }
      );
    }
    if (!verifyPin(pin, user.pin)) {
      return NextResponse.json(agentError('Invalid PIN', 'INVALID_PIN'), { status: 401 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        whatsapp_number: normalizedPhone,
        whatsapp_linked_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[AGENT LINK-PIN] Update error:', updateError);
      return NextResponse.json(
        agentError('Failed to link WhatsApp number', 'LINK_FAILED'),
        { status: 500 }
      );
    }

    return NextResponse.json(
      agentSuccess({
        user: {
          userId: user.id,
          fullName: user.full_name,
          email: user.email,
          balance: user.balance || 0,
        },
      })
    );
  } catch (error) {
    console.error('[AGENT LINK-PIN] Unexpected error:', error);
    return NextResponse.json(
      agentError('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const POST = withAgentAuth(handler);
