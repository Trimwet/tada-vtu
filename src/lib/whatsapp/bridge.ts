import { randomInt } from 'crypto';
import { createClient } from '@supabase/supabase-js';

import { sendEveMessage } from '@/lib/eve-client';

// ── Types ─────────────────────────────────────────────────────────────────────

type WhatsAppProfile = { id: string };

type WhatsAppInboundResult = {
  replyText: string;
  continuationToken: string | null;
  linkCode?: string;
};

// Per-user menu state stored in memory (ephemeral; resets on redeploy).
// Maps phoneNumber → { step, data collected so far }
type MenuState = {
  step: string;
  network?: string;
  phone?: string;
  amount?: number;
  userId?: string;
};

const menuSessions = new Map<string, MenuState>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

export function normalizeWhatsAppNumber(remoteJid: string | null | undefined) {
  if (!remoteJid) return '';
  const jid = remoteJid.split('@')[0] ?? '';
  return jid.replace(/:\d+$/, '').replace(/\D/g, '');
}

export function extractWhatsAppText(message: Record<string, unknown> | null | undefined) {
  if (!message) return '';
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
  return randomInt(100000, 1000000).toString();
}

// ── Bot mode ──────────────────────────────────────────────────────────────────

async function getBotMode(): Promise<'ai' | 'menu'> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('bot_config')
      .select('mode')
      .eq('id', 'default')
      .single();
    return (data?.mode === 'menu') ? 'menu' : 'ai';
  } catch {
    return 'ai'; // safe default
  }
}

// ── USSD-style menu handler ───────────────────────────────────────────────────
// Numbered menus — no AI, no ambiguity, works on any phone.

const MAIN_MENU = `Welcome to TADAPAY 👋

1. Buy Airtime
2. Buy Data
3. Check Balance
4. Transaction History
0. Exit

Reply with a number.`;

const NETWORK_MENU = `Select network:

1. MTN
2. Airtel
3. Glo
4. 9mobile

0. Back to main menu`;

const NETWORKS: Record<string, string> = {
  '1': 'MTN',
  '2': 'Airtel',
  '3': 'Glo',
  '4': '9mobile',
};

function getBase() {
  return process.env.NEXT_APP_URL || 'http://localhost:3000';
}

function getCoreSecret() {
  return process.env.CORE_SECRET || '';
}

async function buyAirtimeMenu(userId: string, network: string, phone: string, amount: number): Promise<string> {
  try {
    const res = await fetch(`${getBase()}/api/airtime/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-core-secret': getCoreSecret() },
      body: JSON.stringify({ userId, network, phone, amount }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json() as { status: boolean; message?: string };
    const result = json.status
      ? `✅ ₦${amount} ${network} airtime sent to ${phone} successfully.`
      : (json.message || 'Purchase failed. Please try again.');
    return `${result}\n\nReply *MENU* for main menu.`;
  } catch {
    return `Purchase failed. Please try again.\n\nReply *MENU* for main menu.`;
  }
}

async function handleMenuMessage(
  phoneNumber: string,
  message: string,
  userId: string,
): Promise<string> {
  const input = message.trim();
  const state = menuSessions.get(phoneNumber) ?? { step: 'main' };

  // ── Main menu ──
  if (state.step === 'main' || input === '0') {
    menuSessions.delete(phoneNumber);
    return MAIN_MENU;
  }

  if (state.step === 'main_prompted') {
    switch (input) {
      case '1': // Airtime
        menuSessions.set(phoneNumber, { step: 'airtime_network', userId });
        return NETWORK_MENU;
      case '2': // Data
        menuSessions.set(phoneNumber, { step: 'data_network', userId });
        return NETWORK_MENU;
      case '3': // Balance
        menuSessions.delete(phoneNumber);
        return await fetchBalance(userId);
      case '4': // History
        menuSessions.delete(phoneNumber);
        return await fetchHistory(userId);
      default:
        return `Invalid option. ${MAIN_MENU}`;
    }
  }

  // ── Airtime flow ──
  if (state.step === 'airtime_network') {
    if (input === '0') { menuSessions.delete(phoneNumber); return MAIN_MENU; }
    const network = NETWORKS[input];
    if (!network) return `Invalid option. ${NETWORK_MENU}`;
    menuSessions.set(phoneNumber, { ...state, step: 'airtime_phone', network });
    return `Enter the phone number to recharge:`;
  }

  if (state.step === 'airtime_phone') {
    if (input === '0') { menuSessions.delete(phoneNumber); return MAIN_MENU; }
    if (!/^\d{11}$/.test(input)) return `Please enter a valid 11-digit phone number:`;
    menuSessions.set(phoneNumber, { ...state, step: 'airtime_amount', phone: input });
    return `Enter amount in naira (e.g. 100):`;
  }

  if (state.step === 'airtime_amount') {
    if (input === '0') { menuSessions.delete(phoneNumber); return MAIN_MENU; }
    const amount = Number(input);
    if (!amount || amount < 50) return `Minimum airtime is ₦50. Enter amount:`;
    const { network, phone } = state;
    menuSessions.set(phoneNumber, { ...state, step: 'airtime_confirm', amount });
    return (
      `Confirm purchase:\n\n` +
      `Network: ${network}\n` +
      `Phone: ${phone}\n` +
      `Amount: ₦${amount}\n\n` +
      `1. Confirm\n2. Cancel`
    );
  }

  if (state.step === 'airtime_confirm') {
    menuSessions.delete(phoneNumber);
    if (input !== '1') return `Purchase cancelled.\n\n${MAIN_MENU}`;
    const { network, phone, amount, userId: uid } = state;
    return await buyAirtimeMenu(uid!, network!, phone!, amount!);
  }

  // ── Data flow ──
  if (state.step === 'data_network') {
    if (input === '0') { menuSessions.delete(phoneNumber); return MAIN_MENU; }
    const network = NETWORKS[input];
    if (!network) return `Invalid option. ${NETWORK_MENU}`;
    menuSessions.set(phoneNumber, { ...state, step: 'data_phone', network });
    return `Enter the phone number for data:`;
  }

  if (state.step === 'data_phone') {
    if (input === '0') { menuSessions.delete(phoneNumber); return MAIN_MENU; }
    if (!/^\d{11}$/.test(input)) return `Please enter a valid 11-digit phone number:`;
    menuSessions.set(phoneNumber, { ...state, step: 'data_plans', phone: input });
    // Fetch and show plans
    return await fetchDataPlansMenu(state.network!, userId);
  }

  if (state.step === 'data_plans') {
    if (input === '0') { menuSessions.delete(phoneNumber); return MAIN_MENU; }
    // User picked a plan number — we need to store plans too. Simplified: redirect to app.
    menuSessions.delete(phoneNumber);
    return (
      `To complete your data purchase, please open the TADAPAY app.\n\n` +
      `Reply *MENU* to return to main menu.`
    );
  }

  // Catch-all — treat as new session
  menuSessions.set(phoneNumber, { step: 'main_prompted', userId });
  return MAIN_MENU;
}

async function fetchBalance(userId: string): Promise<string> {
  try {
    const res = await fetch(
      `${getBase()}/api/wallet/balance?userId=${encodeURIComponent(userId)}`,
      { headers: { 'x-core-secret': getCoreSecret() }, signal: AbortSignal.timeout(10000) },
    );
    const json = await res.json() as { status: boolean; data?: { balance: number }; message?: string };
    if (!json.status || !json.data) return `Could not fetch balance. Please try again.\n\n${MAIN_MENU}`;
    const bal = Number(json.data.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 });
    return `Your TADAPAY balance is ₦${bal}.\n\nReply *MENU* for main menu.`;
  } catch {
    return `Could not fetch balance. Please try again.\n\n${MAIN_MENU}`;
  }
}

async function fetchHistory(userId: string): Promise<string> {
  try {
    const res = await fetch(
      `${getBase()}/api/agent/transactions?userId=${encodeURIComponent(userId)}&limit=5`,
      { headers: { 'x-core-secret': getCoreSecret() }, signal: AbortSignal.timeout(10000) },
    );
    const json = await res.json() as {
      success: boolean;
      transactions?: Array<Record<string, unknown>>;
    };
    if (!json.success || !json.transactions?.length) {
      return `No transactions yet.\n\nReply *MENU* for main menu.`;
    }
    const lines = json.transactions.map((tx) => {
      const amount = Number(tx['amount'] ?? 0);
      const rawDate = String(tx['date'] || tx['created_at'] || '');
      const date = rawDate ? new Date(rawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '?';
      const desc = String(tx['description'] || tx['type'] || '');
      return `${date} ₦${Math.abs(amount).toLocaleString('en-NG')} ${desc}`;
    });
    return `Last 5 transactions:\n${lines.join('\n')}\n\nReply *MENU* for main menu.`;
  } catch {
    return `Could not fetch transactions. Please try again.\n\nReply *MENU* for main menu.`;
  }
}

async function fetchDataPlansMenu(network: string, _userId: string): Promise<string> {
  try {
    const res = await fetch(
      `${getBase()}/api/data-plans?network=${encodeURIComponent(network)}&limit=8`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return `Could not fetch ${network} plans.\n\n${MAIN_MENU}`;
    const json = await res.json() as {
      success: boolean;
      plans?: Array<Record<string, unknown>>;
    };
    if (!json.success || !json.plans?.length) {
      return `No plans available for ${network} right now.\n\n${MAIN_MENU}`;
    }
    const lines = json.plans.slice(0, 8).map((p, i) => {
      const size = String(p['size'] || p['name'] || `Plan ${i + 1}`);
      const price = Number(p['price'] || p['amount'] || 0);
      const validity = String(p['validity'] || '');
      return `${i + 1}. ${size} — ₦${price}${validity ? ` (${validity})` : ''}`;
    });
    return `${network} data plans:\n\n${lines.join('\n')}\n\nReply with plan number or 0 to go back.`;
  } catch {
    return `Could not fetch plans. Please try again.\n\n${MAIN_MENU}`;
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function processWhatsAppInboundMessage(params: {
  phoneNumber: string;
  message: string;
}): Promise<WhatsAppInboundResult> {
  const { phoneNumber, message } = params;
  const supabase = getSupabaseAdmin();

  // Look up user profile
  const { data: profiles, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('whatsapp_number', phoneNumber)
    .limit(1);

  if (lookupError) {
    throw new Error(`WhatsApp profile lookup failed: ${lookupError.message}`);
  }

  // Unlinked user — always send the link code regardless of mode
  if (!profiles || profiles.length === 0) {
    const linkCode = buildLinkCode();
    const { error: insertError } = await supabase.from('whatsapp_pending_links').upsert({
      whatsapp_number: phoneNumber,
      verification_code: linkCode,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      user_id: null,
      verified_at: null,
    }, { onConflict: 'whatsapp_number' });

    if (insertError) {
      throw new Error(`WhatsApp link-code insert failed: ${insertError.message}`);
    }

    return { replyText: buildLinkReply(linkCode), continuationToken: null, linkCode };
  }

  const profile = profiles[0] as WhatsAppProfile;

  // Check bot mode
  const mode = await getBotMode();

  if (mode === 'menu') {
    // "MENU" keyword always resets to main menu
    const input = message.trim().toUpperCase();
    if (input === 'MENU' || input === 'START' || input === 'HI' || input === 'HELLO') {
      menuSessions.set(phoneNumber, { step: 'main_prompted', userId: profile.id });
      return { replyText: MAIN_MENU, continuationToken: null };
    }

    // If no active session, start one
    if (!menuSessions.has(phoneNumber)) {
      menuSessions.set(phoneNumber, { step: 'main_prompted', userId: profile.id });
      return { replyText: MAIN_MENU, continuationToken: null };
    }

    const replyText = await handleMenuMessage(phoneNumber, message, profile.id);
    return { replyText, continuationToken: null };
  }

  // AI mode (default)
  const coreSecret = process.env.CORE_SECRET;
  if (!coreSecret) throw new Error('CORE_SECRET is not set.');

  const { message: replyText } = await sendEveMessage(profile.id, message);
  return { replyText, continuationToken: null };
}
