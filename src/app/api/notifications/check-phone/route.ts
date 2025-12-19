import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// POST - Check if user needs phone number notification
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ status: false, message: 'User ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user has phone number
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', userId)
      .single();

    if (profile?.phone_number) {
      return NextResponse.json({ status: true, message: 'User has phone number' });
    }

    // Check if notification already exists
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .ilike('title', '%Add Your Phone Number%')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ status: true, message: 'Notification already sent' });
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'warning',
      title: '📱 Add Your Phone Number',
      message: 'Please add your phone number in Settings to receive airtime and data. This is required for purchases.',
      is_read: false,
    });

    return NextResponse.json({ status: true, message: 'Notification created' });
  } catch (error) {
    console.error('Check phone notification error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}
