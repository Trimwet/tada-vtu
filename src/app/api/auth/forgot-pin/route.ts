import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOtpEmail } from '@/lib/email';

// Create Supabase admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

// Generate OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// In-memory OTP store (use Redis in production)
const otpStore: Record<string, { otp: string; expires: number }> = {};

export async function POST(request: NextRequest) {
  try {
    const { action, email, otp, newPin } = await request.json();

    const supabase = getSupabaseAdmin();

    if (action === 'request') {
      // Find user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .single();

      if (!profile) {
        return NextResponse.json(
          { success: false, message: 'No account found with this email' },
          { status: 404 }
        );
      }

      // Generate OTP
      const otpCode = generateOTP();

      // Store OTP temporarily (10 minutes expiry)
      otpStore[email] = { otp: otpCode, expires: Date.now() + 10 * 60 * 1000 };

      // Send OTP via email
      try {
        const emailResult = await sendOtpEmail({
          recipientEmail: email,
          recipientName: profile.full_name || 'User',
          otp: otpCode
        });

        if (!emailResult.success) {
          console.error('Failed to send OTP email:', emailResult.error);
          return NextResponse.json(
            { success: false, message: 'Failed to send verification email. Please try again.' },
            { status: 500 }
          );
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
        return NextResponse.json(
          { success: false, message: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email'
      });
    }

    if (action === 'verify') {
      if (!otpStore[email]) {
        return NextResponse.json(
          { success: false, message: 'OTP not requested' },
          { status: 400 }
        );
      }

      if (otpStore[email].expires < Date.now()) {
        delete otpStore[email];
        return NextResponse.json(
          { success: false, message: 'OTP expired' },
          { status: 400 }
        );
      }

      if (otpStore[email].otp !== otp) {
        return NextResponse.json(
          { success: false, message: 'Invalid OTP' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'OTP verified'
      });
    }

    if (action === 'reset') {
      // Verify OTP was verified first
      if (!otpStore[email] || otpStore[email].otp !== otp) {
        return NextResponse.json(
          { success: false, message: 'Please verify OTP first' },
          { status: 400 }
        );
      }

      // Validate new PIN
      if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        return NextResponse.json(
          { success: false, message: 'PIN must be exactly 4 digits' },
          { status: 400 }
        );
      }

      // Simple hash for PIN (use bcrypt in production with proper setup)
      const hashedPin = Buffer.from(newPin + 'tada_salt_2024').toString('base64');

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ pin: hashedPin })
        .eq('email', email.toLowerCase());

      if (error) {
        console.error('PIN update error:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to update PIN' },
          { status: 500 }
        );
      }

      // Clean up OTP
      delete otpStore[email];

      return NextResponse.json({
        success: true,
        message: 'PIN reset successfully'
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Forgot PIN error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
