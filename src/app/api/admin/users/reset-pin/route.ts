import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPinResetNotificationEmail } from '@/lib/email';

function verifyToken(token: string): { valid: boolean; adminId?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) return { valid: false };
    return { valid: true, adminId: payload.id };
  } catch {
    return { valid: false };
  }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { valid, adminId } = verifyToken(authHeader.split(' ')[1]);
    if (!valid || !adminId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get admin info (simplified - just get basic info)
    const { data: admin } = await supabase
      .from('admins')
      .select('full_name')
      .eq('id', adminId)
      .single();

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, email, pin')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json({ 
        error: 'User has no email address. Cannot send notification.' 
      }, { status: 400 });
    }

    // Check if user already has no PIN
    if (!user.pin) {
      return NextResponse.json({
        success: true,
        message: 'User already has no transaction PIN set',
        alreadyReset: true
      });
    }

    // Reset the user's PIN
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        pin: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('PIN reset error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to reset PIN' 
      }, { status: 500 });
    }

    // Send email notification to user
    let emailSent = false;
    try {
      const emailResult = await sendPinResetNotificationEmail({
        recipientEmail: user.email,
        recipientName: user.full_name || 'User',
        adminName: admin?.full_name || 'Admin'
      });

      emailSent = emailResult.success;
      
      if (!emailResult.success) {
        console.error('Failed to send PIN reset email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Email service error:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'User PIN has been reset and notification email sent successfully'
        : 'User PIN has been reset (email notification failed)',
      emailSent,
      resetAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin PIN reset error:', error);
    return NextResponse.json({ 
      error: 'Server error' 
    }, { status: 500 });
  }
}