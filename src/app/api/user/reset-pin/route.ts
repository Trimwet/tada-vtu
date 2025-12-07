import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { newPin, accessToken } = await request.json();

    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { error: 'PIN must be 4 digits' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get user from access token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid session. Please login again.' },
        { status: 401 }
      );
    }

    // Hash the PIN (same as other PIN pages)
    const hashedPin = Buffer.from(newPin + 'tada_salt_2024').toString('base64');

    // Update user's PIN in profiles table
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ pin: hashedPin })
      .eq('id', user.id);

    if (updateError) {
      console.error('PIN update error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update PIN' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'PIN updated successfully' });
  } catch (error) {
    console.error('Reset PIN error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
