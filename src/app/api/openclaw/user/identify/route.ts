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

    // Query database for user with this phone number
    const supabase = createAdminClient();

    type ProfileData = {
      id: string;
      full_name: string | null;
      phone_number: string | null;
      balance: number;
      is_active: boolean;
    };

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, balance, is_active')
      .eq('phone_number', normalizedPhone)
      .single<ProfileData>();

    if (profileError) {
      // Check if it's a "not found" error
      if (profileError.code === 'PGRST116') {
        const registrationUrl = getRegistrationUrl(whatsappNumber);

        return NextResponse.json(
          openclawSuccess({
            isRegistered: false,
            registrationUrl,
            message:
              'Welcome! You need a TADA account to buy data. Register at tadavtu.com to get started.',
          }),
          { status: 200 }
        );
      }

      console.error('[OPENCLAW IDENTIFY] Database error:', profileError);
      return NextResponse.json(
        openclawError(
          'Failed to query user information',
          'DATABASE_ERROR'
        ),
        { status: 500 }
      );
    }

    // User not found (shouldn't happen with single() but just in case)
    if (!data) {
      const registrationUrl = getRegistrationUrl(whatsappNumber);

      return NextResponse.json(
        openclawSuccess({
          isRegistered: false,
          registrationUrl,
          message:
            'Welcome! You need a TADA account to buy data. Register at tadavtu.com to get started.',
        }),
        { status: 200 }
      );
    }

    // Check if account is active
    if (!data.is_active) {
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
        userId: data.id,
        fullName: data.full_name || 'User',
        balance: data.balance || 0,
        currency: 'NGN',
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
