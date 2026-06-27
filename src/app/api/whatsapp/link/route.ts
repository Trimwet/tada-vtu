import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withAuthRateLimit } from '@/lib/auth-protection';

async function handler(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { status: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!code) {
      return NextResponse.json(
        { status: false, message: 'Verification code is required' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: pendingLink, error: pendingError } = await admin
      .from('whatsapp_pending_links')
      .select('whatsapp_number, verification_code, expires_at, verified_at')
      .eq('verification_code', code)
      .gt('expires_at', now)
      .is('verified_at', null)
      .maybeSingle();

    if (pendingError) {
      console.error('[WHATSAPP/LINK] Pending-link lookup failed:', pendingError);
      return NextResponse.json(
        { status: false, message: 'Failed to verify the code' },
        { status: 500 }
      );
    }

    if (!pendingLink) {
      return NextResponse.json(
        { status: false, message: 'That code is invalid or expired' },
        { status: 400 }
      );
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update({
        whatsapp_number: pendingLink.whatsapp_number,
        whatsapp_linked_at: now,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('[WHATSAPP/LINK] Profile update failed:', profileError);
      return NextResponse.json(
        { status: false, message: 'Could not save the WhatsApp link' },
        { status: 500 }
      );
    }

    const { error: linkError } = await admin
      .from('whatsapp_pending_links')
      .update({
        user_id: user.id,
        verified_at: now,
      })
      .eq('verification_code', code);

    if (linkError) {
      console.error('[WHATSAPP/LINK] Pending-link update failed:', linkError);
    }

    return NextResponse.json({
      status: true,
      message: 'WhatsApp linked successfully',
      data: {
        whatsappNumber: pendingLink.whatsapp_number,
        linkedAt: now,
      },
    });
  } catch (error) {
    console.error('[WHATSAPP/LINK] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export const POST = async (request: NextRequest) => {
  return withAuthRateLimit(request, () => handler(request));
};
