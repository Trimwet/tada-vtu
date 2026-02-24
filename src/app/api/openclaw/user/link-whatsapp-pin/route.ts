import { NextRequest, NextResponse } from 'next/server';
import { withOpenClawAuth } from '@/lib/openclaw-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  openclawSuccess,
  openclawError,
  normalizeNigerianPhone,
} from '@/lib/openclaw-utils';
import { withAuthRateLimit } from '@/lib/auth-protection';

// Simple PIN hash (matches the one used in withdrawal routes)
function hashPin(pin: string): string {
  return Buffer.from(pin + 'tada_salt_2024').toString('base64');
}

function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, pin } = body;

    if (!phone || !email || !pin) {
      return NextResponse.json(
        openclawError('Phone, email, and PIN are required', 'MISSING_FIELDS'),
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
      pin: string | null;
      is_active: boolean;
    };

    // Get user by email
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name, balance, pin, is_active')
      .eq('email', email.toLowerCase())
      .maybeSingle<ProfileData>();

    if (userError || !user) {
      return NextResponse.json(
        openclawError('User not found', 'USER_NOT_FOUND'),
        { status: 404 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        openclawError('Account is inactive', 'ACCOUNT_INACTIVE'),
        { status: 403 }
      );
    }

    // Verify PIN
    if (!user.pin) {
      return NextResponse.json(
        openclawError('Please set up your transaction PIN first', 'NO_PIN_SET'),
        { status: 400 }
      );
    }

    const pinValid = verifyPin(pin, user.pin);
    if (!pinValid) {
      return NextResponse.json(
        openclawError('Invalid PIN', 'INVALID_PIN'),
        { status: 401 }
      );
    }

    // Link WhatsApp number to user account
    const { error: updateError } = await supabase
      .from('profiles')
      // @ts-expect-error - whatsapp_number and whatsapp_linked_at fields may not be in type definition
      .update({ 
        whatsapp_number: normalizedPhone,
        whatsapp_linked_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error linking WhatsApp:', updateError);
      return NextResponse.json(
        openclawError('Failed to link WhatsApp number', 'LINK_FAILED'),
        { status: 500 }
      );
    }

    // Return updated user data
    return NextResponse.json(
      openclawSuccess({
        user: {
          userId: user.id,
          fullName: user.full_name,
          email: user.email,
          balance: user.balance || 0
        }
      })
    );

  } catch (error) {
    console.error('Error in link-whatsapp-pin endpoint:', error);
    return NextResponse.json(
      openclawError('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

// Apply rate limiting and brute force protection to PIN verification
export const POST = async (request: NextRequest) => {
  return withAuthRateLimit(request, async () => {
    return withOpenClawAuth(handler)(request);
  });
};
