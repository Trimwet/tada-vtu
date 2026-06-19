import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function parseDeviceInfo(ua: string) {
  const uaLower = ua.toLowerCase();
  const deviceType = /mobile|android|iphone|ipad|ipod/i.test(uaLower)
    ? (/ipad|tablet/i.test(uaLower) ? 'tablet' : 'mobile')
    : 'desktop';
  const os =
    /windows/i.test(uaLower) ? 'Windows' :
    /mac os|macintosh/i.test(uaLower) ? 'macOS' :
    /android/i.test(uaLower) ? 'Android' :
    /ios|iphone|ipad/i.test(uaLower) ? 'iOS' :
    /linux/i.test(uaLower) && !/android/i.test(uaLower) ? 'Linux' :
    null;
  const browser =
    /chrome/i.test(uaLower) && !/edge|opr|opera/i.test(uaLower) ? 'Chrome' :
    /firefox/i.test(uaLower) && !/seamonkey/i.test(uaLower) ? 'Firefox' :
    /safari/i.test(uaLower) && !/chrome|edge/i.test(uaLower) ? 'Safari' :
    /edge/i.test(uaLower) ? 'Edge' :
    /opr|opera/i.test(uaLower) ? 'Opera' :
    null;
  return { deviceType, os, browser };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userAgent } = await request.json();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const { deviceType, os, browser } = parseDeviceInfo(userAgent || '');

    const existing = await (supabase.from('user_sessions') as any)
      .select('id, session_count')
      .eq('user_id', user.id)
      .eq('ip_address', ip)
      .eq('user_agent', userAgent || '')
      .maybeSingle();

    if (existing.data) {
      await (supabase.from('user_sessions') as any)
        .update({
          session_count: existing.data.session_count + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existing.data.id);
    } else {
      await (supabase.from('user_sessions') as any)
        .insert({
          user_id: user.id,
          ip_address: ip,
          user_agent: userAgent || null,
          device_type: deviceType,
          os,
          browser,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track session error:', error);
    return NextResponse.json({ success: true });
  }
}
