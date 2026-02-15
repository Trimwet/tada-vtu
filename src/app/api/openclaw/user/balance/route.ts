// OpenClaw Balance Inquiry Endpoint
// Retrieves current wallet balance for a user

import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  openclawSuccess,
  openclawError,
  formatNaira,
} from '@/lib/openclaw-utils';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

async function handler(request: NextRequest) {
  try {
    // Get user ID from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        openclawError('User ID is required', 'MISSING_USER_ID'),
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      `openclaw:balance:${userId}`,
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

    // Query database for user balance
    const supabase = createAdminClient();

    type ProfileData = {
      id: string;
      balance: number;
      is_active: boolean;
    };

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, balance, is_active')
      .eq('id', userId)
      .single<ProfileData>();

    if (profileError) {
      // Check if it's a "not found" error
      if (profileError.code === 'PGRST116') {
        return NextResponse.json(
          openclawError('User not found', 'USER_NOT_FOUND'),
          { status: 404 }
        );
      }

      console.error('[OPENCLAW BALANCE] Database error:', profileError);
      return NextResponse.json(
        openclawError('Failed to query balance', 'DATABASE_ERROR'),
        { status: 500 }
      );
    }

    // User not found (shouldn't happen with single() but just in case)
    if (!data) {
      return NextResponse.json(
        openclawError('User not found', 'USER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if account is active
    if (!data.is_active) {
      return NextResponse.json(
        openclawError(
          'Account is inactive. Please contact support.',
          'ACCOUNT_INACTIVE'
        ),
        { status: 403 }
      );
    }

    const balance = data.balance || 0;

    // Return balance
    return NextResponse.json(
      openclawSuccess({
        balance,
        currency: 'NGN',
        formatted: formatNaira(balance),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[OPENCLAW BALANCE] Unexpected error:', error);
    return NextResponse.json(
      openclawError('An unexpected error occurred', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export const GET = withOpenClawAuth(handler);
