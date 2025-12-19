import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getThemeById } from '@/lib/gift-cards';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// GET - Fetch gift card details (public for opening)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: giftId } = await params;

    if (!giftId) {
      return NextResponse.json({ status: false, message: 'Gift ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: gift, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', giftId)
      .single();

    if (error || !gift) {
      return NextResponse.json({ status: false, message: 'Gift not found' }, { status: 404 });
    }

    // Check if expired
    if (new Date(gift.expires_at) < new Date() && gift.status !== 'credited') {
      // Mark as expired
      await supabase
        .from('gift_cards')
        .update({ status: 'expired' })
        .eq('id', giftId);

      return NextResponse.json({
        status: false,
        message: 'This gift has expired',
        data: { expired: true },
      }, { status: 410 });
    }

    // Get theme details
    const theme = getThemeById(gift.theme_id);

    // Return full gift data - the page handles display logic
    return NextResponse.json({
      status: true,
      data: {
        ...gift,
        theme: theme || { id: 'default', name: 'Gift', icon: 'gift', primaryColor: '#22C55E', secondaryColor: '#10B981', animation: 'confetti' },
      },
    });

  } catch (error) {
    console.error('Gift GET error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}
