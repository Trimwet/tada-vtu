// TADAPAY Agent User Identification Endpoint
// Maps WhatsApp phone numbers → TADA user accounts.
// Strategy: direct phone match → pending link lookup → email extraction → create pending link

import { NextRequest, NextResponse } from 'next/server';
import { withAgentAuth } from '@/lib/agent-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  agentSuccess,
  agentError,
  normalizeNigerianPhone,
  getRegistrationUrl,
} from '@/lib/agent-utils';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const whatsappNumber = searchParams.get('whatsapp');
    const message = searchParams.get('message') || '';

    if (!whatsappNumber) {
      return NextResponse.json(
        agentError('whatsapp number is required', 'MISSING_WHATSAPP_NUMBER'),
        { status: 400 }
      );
    }

    const rateLimit = checkRateLimit(
      `agent:identify:${whatsappNumber}`,
      RATE_LIMITS.agent
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        agentError(
          `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          'RATE_LIMIT_EXCEEDED'
        ),
        { status: 429 }
      );
    }

    const normalizedPhone = normalizeNigerianPhone(whatsappNumber);
    if (!normalizedPhone) {
      return NextResponse.json(
        agentError(
          'Invalid phone number format. Please use Nigerian format (e.g., 08012345678)',
          'INVALID_PHONE_FORMAT'
        ),
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    type ProfileData = {
      id: string;
      full_name: string | null;
      phone_number: string | null;
      whatsapp_number: string | null;
      balance: number;
      is_active: boolean;
    };

    // STRATEGY 1: Direct phone match
    const { data: directMatch } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, whatsapp_number, balance, is_active')
      .or(`phone_number.eq.${normalizedPhone},whatsapp_number.eq.${normalizedPhone}`)
      .maybeSingle<ProfileData>();

    if (directMatch) {
      if (!directMatch.is_active) {
        return NextResponse.json(
          agentError(
            'Your account has been deactivated. Please contact support@tadavtu.com',
            'ACCOUNT_INACTIVE'
          ),
          { status: 403 }
        );
      }
      return NextResponse.json(
        agentSuccess({
          isRegistered: true,
          userId: directMatch.id,
          fullName: directMatch.full_name || 'User',
          balance: directMatch.balance || 0,
          currency: 'NGN',
          method: 'phone_match',
        }),
        { status: 200 }
      );
    }

    // STRATEGY 2: Pending WhatsApp link
    try {
      const { data: pendingLink } = await supabase
        .from('whatsapp_pending_links')
        .select('user_id, verification_code, expires_at')
        .eq('whatsapp_number', normalizedPhone)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (pendingLink) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tadavtu.com';
        return NextResponse.json(
          agentSuccess({
            isRegistered: false,
            needsVerification: true,
            linkUrl: `${appUrl}/link-whatsapp?code=${(pendingLink as any).verification_code}`,
            verificationCode: (pendingLink as any).verification_code,
          }),
          { status: 200 }
        );
      }
    } catch {
      // whatsapp_pending_links table not yet created — skip
    }

    // STRATEGY 3: Email in message body
    if (message.includes('@') && message.includes('.')) {
      const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        const email = emailMatch[0].toLowerCase();
        const { data: emailUser } = await supabase
          .from('profiles')
          .select('id, full_name, balance, is_active')
          .eq('email', email)
          .maybeSingle<ProfileData>();

        if (emailUser?.is_active) {
          await supabase
            .from('profiles')
            .update({
              whatsapp_number: normalizedPhone,
              whatsapp_linked_at: new Date().toISOString(),
            })
            .eq('id', emailUser.id);

          return NextResponse.json(
            agentSuccess({
              isRegistered: true,
              userId: emailUser.id,
              fullName: emailUser.full_name || 'User',
              balance: emailUser.balance || 0,
              currency: 'NGN',
              method: 'email_link',
              message: '✅ WhatsApp linked successfully! You can now use all features.',
            }),
            { status: 200 }
          );
        }
      }
    }

    // STRATEGY 4: Create a pending link for first-time users
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tadavtu.com';

    try {
      await supabase
        .from('whatsapp_pending_links')
        .insert({
          whatsapp_number: normalizedPhone,
          verification_code: verificationCode,
          expires_at: expiresAt,
        } as any);
    } catch {
      // Table not yet created — skip silently
    }

    const registrationUrl = getRegistrationUrl(whatsappNumber);
    const linkUrl = `${appUrl}/link-whatsapp?code=${verificationCode}`;

    return NextResponse.json(
      agentSuccess({
        isRegistered: false,
        needsLinking: true,
        registrationUrl,
        linkUrl,
        verificationCode,
        message:
          `👋 Welcome to TADA VTU!\n\n` +
          `If you already have an account, link it here:\n${linkUrl}\n\n` +
          `Or register a new account:\n${registrationUrl}\n\n` +
          `You can also reply with your registered email to link automatically.`,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[AGENT IDENTIFY] Unexpected error:', error);
    return NextResponse.json(
      agentError('An unexpected error occurred', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withAgentAuth(handler);
