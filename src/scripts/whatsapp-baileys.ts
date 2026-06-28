/**
 * whatsapp-baileys.ts
 *
 * Baileys WhatsApp bot — TADAPAY Eve assistant.
 *
 * Session is persisted in Supabase (useSupabaseAuthState).
 * On every reconnect, auth state is reloaded fresh from Supabase so we
 * always use the latest signal keys even after a container restart.
 *
 * Disconnect handling (matches architecture diagram):
 *   401 / loggedOut, badSession, replaced, forbidden → process.exit(1)
 *     → Render marks the deploy as failed, no auto-restart.
 *     → Admin deletes Supabase row and re-deploys to re-scan QR.
 *   All others → exponential backoff reconnect with fresh Supabase session.
 *
 * Health server on PORT (default 3001) keeps UptimeRobot from letting
 * the Render free-tier container go cold.
 */

import { createServer } from 'node:http';

import makeWASocket, { DisconnectReason } from 'baileys';
import QRCode from 'qrcode';

import {
  extractWhatsAppText,
  normalizeWhatsAppNumber,
  processWhatsAppInboundMessage,
} from '@/lib/whatsapp/bridge';
import { useSupabaseAuthState } from '@/lib/whatsapp/supabase-auth';

// ── Constants ──────────────────────────────────────────────────────────────────

const RECONNECT_BASE_DELAY_MS = 2_000;
const RECONNECT_MAX_DELAY_MS = 60_000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEALTH_PORT = Number(process.env.PORT ?? 3001);

// ── State ──────────────────────────────────────────────────────────────────────

let activeSocket: ReturnType<typeof makeWASocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let shuttingDown = false;
let connectInFlight: Promise<void> | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────────

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function getReconnectDelay(attempt: number) {
  const delay = RECONNECT_BASE_DELAY_MS * 2 ** attempt;
  return Math.min(delay, RECONNECT_MAX_DELAY_MS);
}

/**
 * Terminal disconnect reasons — do NOT retry.
 * These mean the session is invalidated; re-scanning QR is required.
 */
function isTerminalDisconnect(code: number | undefined): boolean {
  return (
    code === DisconnectReason.loggedOut ||         // 401 — WhatsApp invalidated session
    code === DisconnectReason.connectionReplaced || // 440 — another client replaced us
    code === DisconnectReason.badSession ||         // session corrupted
    code === DisconnectReason.multideviceMismatch ||
    code === DisconnectReason.forbidden             // 403
  );
}

function describeDisconnect(code: number | undefined): string {
  switch (code) {
    case DisconnectReason.loggedOut:              return 'logged out (401)';
    case DisconnectReason.connectionReplaced:     return 'replaced by another session';
    case DisconnectReason.badSession:             return 'bad session';
    case DisconnectReason.multideviceMismatch:    return 'multi-device mismatch';
    case DisconnectReason.forbidden:              return 'forbidden (403)';
    case DisconnectReason.restartRequired:        return 'restart required';
    case DisconnectReason.connectionClosed:       return 'connection closed';
    case DisconnectReason.connectionLost:         return 'connection lost';
    case DisconnectReason.timedOut:               return 'timed out';
    case DisconnectReason.unavailableService:     return 'service unavailable';
    default:                                      return `code ${code ?? 'unknown'}`;
  }
}

function scheduleReconnect(reason: string) {
  if (shuttingDown) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(
      `[Baileys] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached after: ${reason}. Exiting.`,
    );
    process.exit(1);
  }

  clearReconnectTimer();
  const delay = getReconnectDelay(reconnectAttempts);
  reconnectAttempts += 1;

  console.log(`[Baileys] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}): ${reason}`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void startWhatsAppBridge();
  }, delay);
}

// ── Core connection ────────────────────────────────────────────────────────────

async function startWhatsAppBridge() {
  if (shuttingDown) return;

  // Guard: prevent concurrent connect calls.
  if (connectInFlight) return connectInFlight;

  connectInFlight = (async () => {
    // ── Load session from Supabase (fresh on every connect attempt). ───────
    // This is the critical difference vs useMultiFileAuthState: on reconnect
    // after a container restart, we always have the latest Supabase-persisted
    // signal keys — no stale in-memory state.
    const { state, saveCreds } = await useSupabaseAuthState();

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['TADAPAY Eve', 'Chrome', '1.0'],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      fireInitQueries: false,
    });

    activeSocket = sock;

    // Persist credentials on every update (QR scan, key rotation, etc.)
    sock.ev.on('creds.update', saveCreds);

    // ── Connection lifecycle ────────────────────────────────────────────────
    sock.ev.on('connection.update', async update => {
      // Print QR code if we're on a fresh session (no Supabase row yet).
      if (update.qr) {
        console.log('[Baileys] 📱 Scan this QR with WhatsApp → Linked Devices → Link a Device:\n');
        console.log(await QRCode.toString(update.qr, { type: 'terminal', small: true }));
      }

      if (update.connection === 'open') {
        reconnectAttempts = 0; // Reset backoff counter on successful connect.
        clearReconnectTimer();
        console.log('[Baileys] ✅ WhatsApp connection established.');
      }

      if (update.connection === 'close') {
        const code =
          (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
            ?.output?.statusCode;

        activeSocket = null;
        const description = describeDisconnect(code);

        if (isTerminalDisconnect(code)) {
          // ── Terminal: session is gone. Bail out cleanly. ─────────────────
          // Render's restart-on-failure won't trigger (we exit 0 for loggedOut
          // to signal "intentional exit, no point restarting same broken session").
          console.error(
            `[Baileys] ❌ Terminal disconnect: ${description}.\n` +
            `  → To reconnect: delete the 'default' row in baileys_sessions (Supabase) and redeploy.\n` +
            `  → The next deploy will print a QR code in Render logs.`,
          );
          process.exit(code === DisconnectReason.loggedOut ? 0 : 1);
        }

        // ── Transient: retry with backoff + fresh Supabase session. ───────
        console.warn(`[Baileys] ⚠️  Disconnected: ${description}. Will reconnect.`);
        scheduleReconnect(description);
      }
    });

    // ── Message handler ─────────────────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const inbound of messages) {
        if (inbound.key.fromMe) continue;

        const remoteJid = inbound.key.remoteJid;
        if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) continue;

        const phoneNumber = normalizeWhatsAppNumber(remoteJid);
        const messageText = extractWhatsAppText(inbound.message as Record<string, unknown> | undefined);

        if (!phoneNumber || !messageText) continue;

        console.log(`[Baileys] 📩 ${phoneNumber}: ${messageText.slice(0, 80)}`);

        // Show typing indicator.
        await sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});

        try {
          const { replyText } = await processWhatsAppInboundMessage({ phoneNumber, message: messageText });

          if (replyText) {
            await sock.sendMessage(remoteJid, { text: replyText });
            console.log(`[Baileys] 📤 → ${phoneNumber}: ${replyText.slice(0, 80)}`);
          }
        } catch (error) {
          console.error('[Baileys] Failed to process inbound message:', error);
          await sock
            .sendMessage(remoteJid, { text: '❌ I could not process that right now. Please try again.' })
            .catch(() => {});
        }

        await sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
      }
    });
  })().finally(() => {
    connectInFlight = null;
  });

  return connectInFlight;
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────

process.once('SIGINT', () => {
  console.log('[Baileys] SIGINT — shutting down gracefully…');
  shuttingDown = true;
  clearReconnectTimer();
  activeSocket?.end(undefined);
});

process.once('SIGTERM', () => {
  console.log('[Baileys] SIGTERM — shutting down gracefully…');
  shuttingDown = true;
  clearReconnectTimer();
  activeSocket?.end(undefined);
});

// ── Health check server (keeps UptimeRobot / Render free tier warm) ───────────

createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connected: activeSocket !== null, ts: Date.now() }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
}).listen(HEALTH_PORT, () => {
  console.log(`[Baileys] 🩺 Health check → http://localhost:${HEALTH_PORT}/health`);
});

// ── Boot ───────────────────────────────────────────────────────────────────────

console.log('[Baileys] 🚀 Starting TADAPAY WhatsApp bot…');
void startWhatsAppBridge().catch(error => {
  console.error('[Baileys] Fatal startup error:', error);
  process.exit(1);
});
