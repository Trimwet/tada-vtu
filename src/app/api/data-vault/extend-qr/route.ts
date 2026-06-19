import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { qrId, days = 7 } = await request.json();

    if (!qrId) {
      return NextResponse.json({ status: false, message: 'QR ID is required' }, { status: 400 });
    }

    // Get current expiry
    const { data: qr, error: fetchError } = await (supabase as any)
      .from('vault_qr_codes')
      .select('expires_at, user_id')
      .eq('id', qrId)
      .single();

    if (fetchError || !qr) {
      return NextResponse.json({ status: false, message: 'QR code not found' }, { status: 404 });
    }

    const q = qr as any;
    if (q.user_id !== user.id) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const newExpiry = new Date(new Date(q.expires_at).getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await (supabase as any)
      .from('vault_qr_codes')
      .update({ expires_at: newExpiry })
      .eq('id', qrId);

    if (updateError) {
      return NextResponse.json({ status: false, message: 'Failed to extend expiry' }, { status: 500 });
    }

    return NextResponse.json({ 
      status: true, 
      message: `Expiry extended by ${days} days`,
      data: { expiresAt: newExpiry }
    });

  } catch (error) {
    console.error('[EXTEND-QR] Unexpected error:', error);
    return NextResponse.json({ status: false, message: 'Internal server error' }, { status: 500 });
  }
}
