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

// Store OTP in database temporarily
async function storeOTP(supabase: any, email: string, otp: string) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  // Use upsert to handle multiple requests for same email
  const { error } = await supabase
    .from('profiles')
    .update({ 
      reset_otp: otp,
      reset_otp_expires: expiresAt.toISOString()
    })
    .eq('email', email.toLowerCase());
    
  return !error;
}

// Verify and clear OTP from database
async function verifyOTP(supabase: any, email: string, otp: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('reset_otp, reset_otp_expires')
    .eq('email', email.toLowerCase())
    .single();

  if (!profile || !profile.reset_otp) {
    return { valid: false, message: 'OTP not requested' };
  }

  if (new Date(profile.reset_otp_expires) < new Date()) {
    // Clear expired OTP
    await supabase
      .from('profiles')
      .update({ reset_otp: null, reset_otp_expires: null })
      .eq('email', email.toLowerCase());
    return { valid: false, message: 'OTP expired' };
  }

  if (profile.reset_otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }

  return { valid: true, message: 'OTP verified' };
}

// Clear OTP from database
async function clearOTP(supabase: any, email: string) {
  await supabase
    .from('profiles')
    .update({ reset_otp: null, reset_otp_expires: null })
    .eq('email', email.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const { action, email, otp, newPin } = await request.json();

    const supabase = getSupabaseAdmin();

    if (action === 'request') {
      // Find user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
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

      // Store OTP in database
      const stored = await storeOTP(supabase, email, otpCode);
      if (!stored) {
        return NextResponse.json(
          { success: false, message: 'Failed to generate verification code. Please try again.' },
          { status: 500 }
        );
      }

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
      const verification = await verifyOTP(supabase, email, otp);
      
      if (!verification.valid) {
        return NextResponse.json(
          { success: false, message: verification.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'OTP verified'
      });
    }

    if (action === 'reset') {
      // Verify OTP first
      const verification = await verifyOTP(supabase, email, otp);
      
      if (!verification.valid) {
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

      // Update profile and clear OTP
      const { error } = await supabase
        .from('profiles')
        .update({ 
          pin: hashedPin,
          reset_otp: null,
          reset_otp_expires: null
        })
        .eq('email', email.toLowerCase());

      if (error) {
        console.error('PIN update error:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to update PIN' },
          { status: 500 }
        );
      }

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
