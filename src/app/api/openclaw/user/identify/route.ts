// OpenClaw User Identification Endpoint
// Maps WhatsApp phone numbers to TADA user accounts

import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  openclawSuccess,
  openclawError,
  normalizeNigerianPhone,
  getRegistrationUrl,
} from '@/lib/openclaw-utils';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

async function handler(request: NextRequest) {
  try {
    // Get WhatsApp number from query params
    const { searchParams } = new URL(request.url);
    const whatsappNumber = searchParams.get('whatsapp');
    const message = searchParams.get('message') || ''; // Optional: user's message for email detection

    if (!whatsappNumber) {
      return NextResponse.json(
        openclawError(
          'WhatsApp number is required',
          'MISSING_WHATSAPP_NUMBER'
        ),
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      `openclaw:identify:${whatsappNumber}`,
      RATE_LIMITS.openclaw
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        openclawError(
          `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          'RATE_LIMIT_EXCEEDED'
        ),
        { status: 429 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizeNigerianPhone(whatsappNumber);

    if (!normalizedPhone) {
      return NextResponse.json(
        openclawError(
          'Invalid phone number format. Please use Nigerian format (e.g., 0903837261)',
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

    // STRATEGY 1: Try direct phone match (phone_number OR whatsapp_number)
    const { data: directMatch, error: directError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, whatsapp_number, balance, is_active')
      .or(`phone_number.eq.${normalizedPhone},whatsapp_number.eq.${normalizedPhone}`)
      .maybeSingle<ProfileData>();

    if (directMatch) {
      // Check if account is active
      if (!directMatch.is_active) {
        return NextResponse.json(
          openclawError(
            'Your account has been deactivated. Please contact support@tadavtu.com',
            'ACCOUNT_INACTIVE'
          ),
          { status: 403 }
        );
      }

      // User found - return user info
      return NextResponse.json(
        openclawSuccess({
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

    // STRATEGY 2: Check if there's a pending link for this WhatsApp number
    // Note: This requires migration 028 to be applied first
    try {
      const { data: pendingLink } = await supabase
        .from('whatsapp_pending_links')
        .select('user_id, verification_code, expires_at')
        .eq('whatsapp_number', normalizedPhone)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (pendingLink) {
        return NextResponse.json(
          openclawSuccess({
            isRegistered: false,
            needsVerification: true,
            message: `To link your WhatsApp, visit: ${process.env.NEXT_PUBLIC_APP_URL || 'https://tadavtu.com'}/link-whatsapp?code=${(pendingLink as any).verification_code}`,
            verificationCode: (pendingLink as any).verification_code,
          }),
          { status: 200 }
        );
      }
    } catch (tableError) {
      // Table doesn't exist yet - skip this strategy
      console.log('[OPENCLAW IDENTIFY] whatsapp_pending_links table not found - skipping strategy 2');
    }

    // STRATEGY 3: Email lookup (if message contains an email)
    if (message && message.includes('@') && message.includes('.')) {
      const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        const email = emailMatch[0].toLowerCase();
        const { data: emailUser } = await supabase
          .from('profiles')
          .select('id, full_name, balance, is_active')
          .eq('email', email)
          .maybeSingle<ProfileData>();

        if (emailUser && emailUser.is_active) {
          // Link this WhatsApp number to the account
          await supabase
            .from('profiles')
            // @ts-expect-error - whatsapp_number field added in migration 028
            .update({
              whatsapp_number: normalizedPhone,
              whatsapp_linked_at: new Date().toISOString(),
            })
            .eq('id', emailUser.id);

          return NextResponse.json(
            openclawSuccess({
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

    // STRATEGY 4: Create pending link for first-time users
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
      await supabase
        .from('whatsapp_pending_links')
        .insert({
          whatsapp_number: normalizedPhone,
          verification_code: verificationCode,
          expires_at: expiresAt.toISOString(),
        } as any);
    } catch (insertError) {
      // Table doesn't exist yet - skip pending link creation
      console.log('[OPENCLAW IDENTIFY] whatsapp_pending_links table not found - skipping pending link creation');
    }

    const registrationUrl = getRegistrationUrl(whatsappNumber);
    const linkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tadavtu.com'}/link-whatsapp?code=${verificationCode}`;

    return NextResponse.json(
      openclawSuccess({
        isRegistered: false,
        needsLinking: true,
        registrationUrl,
        linkUrl,
        verificationCode,
        message:
          `👋 Welcome to TADA VTU!\n\n` +
          `If you have an account, link it here:\n${linkUrl}\n\n` +
          `Or register a new account:\n${registrationUrl}\n\n` +
          `You can also reply with your registered email to link automatically.`,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[OPENCLAW IDENTIFY] Unexpected error:', error);
    return NextResponse.json(
      openclawError(
        'An unexpected error occurred',
        'INTERNAL_ERROR'
      ),
      { status: 500 }
    );
  }
}

export const GET = withOpenClawAuth(handler);
