import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuthRateLimit } from '@/lib/auth-protection';

// Create Supabase admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Simple PIN hash comparison (for demo - use bcrypt in production)
function hashPin(pin: string): string {
  return Buffer.from(pin + 'tada_salt_2024').toString('base64');
}

function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPin, newPin, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get user profile with PIN
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('pin, id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, message: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify current PIN
    if (!verifyPin(currentPin, profile.pin || '')) {
      return NextResponse.json(
        { success: false, message: 'Current PIN is incorrect' },
        { status: 400 }
      );
    }

    // Validate new PIN
    const { pinSchema, validateFormData } = await import('@/lib/validation');
    const validation = validateFormData(pinSchema, newPin);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.errors?.[0] || 'Invalid new PIN format' },
        { status: 400 }
      );
    }

    // Hash new PIN
    const hashedPin = hashPin(newPin);

    // Update PIN
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ pin: hashedPin })
      .eq('id', userId);

    if (updateError) {
      console.error('PIN update error:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update PIN' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'PIN updated successfully'
    });

  } catch (error) {
    console.error('PIN reset error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting and brute force protection
export const POST = async (request: NextRequest) => {
  return withAuthRateLimit(request, () => handler(request));
};
