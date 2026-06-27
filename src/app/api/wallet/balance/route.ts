import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { coreBalance } from '@/lib/api/core';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    // ── Agent access (Eve tools, internal services) ──────────────────────────
    // Accepts x-core-secret header — same pattern as /api/airtime/buy and
    // /api/data/buy. No user JWT required for trusted internal callers.
    const coreSecret = request.headers.get('x-core-secret');
    const validCoreSecret = process.env.CORE_SECRET;

    if (coreSecret && validCoreSecret && coreSecret === validCoreSecret) {
      if (!requestedUserId) {
        return NextResponse.json(
          { status: false, message: 'userId parameter is required' },
          { status: 400 }
        );
      }

      // Resolve phone numbers to Supabase UUIDs.
      // Eve sends the WhatsApp phone number (e.g. "2349161125529") as userId;
      // the profiles table keyed by UUID, but has a whatsapp_number column.
      let resolvedUserId = requestedUserId;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedUserId);
      if (!isUUID) {
        const supabase = getSupabaseAdmin();
        // Try whatsapp_number with and without leading +
        const normalised = requestedUserId.replace(/^\+/, '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .or(`whatsapp_number.eq.${normalised},whatsapp_number.eq.+${normalised}`)
          .maybeSingle();
        if (profile) {
          resolvedUserId = profile.id;
        } else {
          return NextResponse.json(
            { status: false, message: 'No TADAPAY account linked to this WhatsApp number. Please link your account first.' },
            { status: 404 }
          );
        }
      }

      const result = await coreBalance(resolvedUserId);
      return NextResponse.json({
        status: true,
        data: { balance: result.balance, currency: 'NGN' },
      });
    }

    // ── Standard user access (app / web dashboard) ───────────────────────────
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: false, message: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { status: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!requestedUserId) {
      return NextResponse.json(
        { status: false, message: 'userId parameter is required' },
        { status: 400 }
      );
    }

    if (requestedUserId !== user.id) {
      return NextResponse.json({ status: false, message: 'Unauthorized access' }, { status: 403 });
    }

    const result = await coreBalance(requestedUserId);
    return NextResponse.json({
      status: true,
      data: { balance: result.balance, currency: 'NGN' },
    });
  } catch (error) {
    console.error('[WALLET-BALANCE] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch balance';
    return NextResponse.json({ status: false, message: msg }, { status: 500 });
  }
}
