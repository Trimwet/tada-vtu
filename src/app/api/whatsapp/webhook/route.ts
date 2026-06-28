import { NextRequest, NextResponse } from 'next/server';
import { processWhatsAppInboundMessage } from '@/lib/whatsapp/bridge';
import { checkRateLimit } from '@/lib/rate-limiter';

function verifyCoreSecret(request: NextRequest): boolean {
  const secret = process.env.CORE_SECRET;
  if (!secret) return false; // refuse all if not configured
  return request.headers.get('x-core-secret') === secret;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sendWhatsAppMessage(to: string, body: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return; // credentials not configured yet
  await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    }
  );
}

// ── GET — webhook verification ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return NextResponse.json({ status: 'WhatsApp webhook active' });
}

// ── POST — incoming message ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Only the Baileys bot (and our own internal callers) may POST here.
  if (!verifyCoreSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let message = '';
  let phoneNumber = '';

  try {
    const body = await request.json();

    // Support both Cloud API webhook shape and the legacy mock shape.
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    if (entry) {
      // Official Cloud API format
      const msg = entry.messages?.[0];
      if (!msg) return NextResponse.json({ ok: true }); // delivery receipt, ignore
      message = msg.text?.body ?? msg.type ?? '';
      phoneNumber = msg.from ?? '';
    } else if (body.phoneNumber) {
      // Baileys bot direct format: { phoneNumber, message }
      message = body.message ?? '';
      phoneNumber = body.phoneNumber ?? '';
    } else {
      // Legacy / mock format
      message = body.message?.text ?? body.message ?? '';
      phoneNumber = body.from ?? '';
    }

    if (!message || !phoneNumber) {
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    // ── Per-phone rate limit: 30 messages per 15-minute window ───────────────
    const rl = checkRateLimit(`wa:${phoneNumber}`);
    if (!rl.allowed) {
      console.warn(`[WhatsApp] Rate limit hit for ${phoneNumber}`);
      // Return 200 to WhatsApp (avoid retries) but don't process the message
      return NextResponse.json({ ok: true });
    }

    // ── Forward message to Eve Agent via the shared bridge ───────────────────
    const { replyText } = await processWhatsAppInboundMessage({
      phoneNumber,
      message,
    });

    console.log(`[WhatsApp] Reply to ${phoneNumber}: ${replyText.substring(0, 120)}...`);

    // ── Send reply via WhatsApp (no-op if credentials not configured) ────────
    await sendWhatsAppMessage(phoneNumber, replyText);

    return NextResponse.json({ replyText });

  } catch (error) {
    console.error('[WhatsApp] Webhook error:', error);
    return NextResponse.json(
      { replyText: '❌ An error occurred. Please try again later.' },
      { status: 200 }  // always 200 so the bot sends the replyText
    );
  }
}
