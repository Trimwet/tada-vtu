import { randomInt } from 'crypto';
import { createClient } from '@supabase/supabase-js';

import { sendEveMessage } from '@/lib/eve-client';

type WhatsAppProfile = {
  id: string;
};

type WhatsAppInboundResult = {
  replyText: string;
  continuationToken: string | null;
  linkCode?: string;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(url, serviceKey);
}

export function normalizeWhatsAppNumber(remoteJid: string | null | undefined) {
  if (!remoteJid) {
    return '';
  }

  const jid = remoteJid.split('@')[0] ?? '';
  return jid.replace(/:\d+$/, '').replace(/\D/g, '');
}

export function extractWhatsAppText(message: Record<string, unknown> | null | undefined) {
  if (!message) {
    return '';
  }

  const body = message as {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
  };

  const text =
    body.conversation ??
    body.extendedTextMessage?.text ??
    body.imageMessage?.caption ??
    body.videoMessage?.caption ??
    '';

  return typeof text === 'string' ? text.trim() : '';
}

function buildLinkReply(linkCode: string) {
  return (
    `👋 Hi! This number isn't linked to a TADAPAY account yet.\n\n` +
    `To link your account, open the app and enter this code:\n\n` +
    `*${linkCode}*\n\n` +
    `The code expires in 10 minutes.`
  );
}

function buildLinkCode() {
  // crypto.randomInt is cryptographically secure (unlike Math.random)
  return randomInt(100000, 1000000).toString();
}



export async function processWhatsAppInboundMessage(params: {
  phoneNumber: string;
  message: string;
}): Promise<WhatsAppInboundResult> {
  const { phoneNumber, message } = params;
  const supabase = getSupabaseAdmin();

  const { data: profiles, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('whatsapp_number', phoneNumber)
    .limit(1);

  if (lookupError) {
    throw new Error(`WhatsApp profile lookup failed: ${lookupError.message}`);
  }

  if (!profiles || profiles.length === 0) {
    const linkCode = buildLinkCode();
    const { error: insertError } = await supabase.from('whatsapp_pending_links').upsert({
      whatsapp_number: phoneNumber,
      verification_code: linkCode,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      user_id: null,
      verified_at: null,
    }, {
      onConflict: 'whatsapp_number',
    });

    if (insertError) {
      throw new Error(`WhatsApp link-code insert failed: ${insertError.message}`);
    }

    return {
      replyText: buildLinkReply(linkCode),
      continuationToken: null,
      linkCode,
    };
  }

  const profile = profiles[0] as WhatsAppProfile;
  const coreSecret = process.env.CORE_SECRET;
  if (!coreSecret) {
    throw new Error('CORE_SECRET is not set.');
  }

  const { message: replyText } = await sendEveMessage(profile.id, message);

  return {
    replyText,
    continuationToken: null,
  };
}
