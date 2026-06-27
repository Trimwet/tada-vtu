import path from 'node:path';

import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'baileys';
import QRCode from 'qrcode';

import {
  extractWhatsAppText,
  normalizeWhatsAppNumber,
  processWhatsAppInboundMessage,
} from '@/lib/whatsapp/bridge';

const AUTH_DIR = path.resolve(process.cwd(), '.baileys-auth');
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 5;

let activeSocket: ReturnType<typeof makeWASocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let shuttingDown = false;
let connectInFlight: Promise<void> | null = null;
let shutdownHandlerRegistered = false;

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

function shouldReconnect(statusCode: number | undefined) {
  switch (statusCode) {
    case DisconnectReason.loggedOut:
    case DisconnectReason.connectionReplaced:
    case DisconnectReason.badSession:
    case DisconnectReason.multideviceMismatch:
    case DisconnectReason.forbidden:
      return false;
    case DisconnectReason.restartRequired:
    case DisconnectReason.connectionClosed:
    case DisconnectReason.connectionLost:
    case DisconnectReason.timedOut:
    case DisconnectReason.unavailableService:
      return true;
    default:
      return statusCode !== undefined;
  }
}

function describeDisconnect(statusCode: number | undefined) {
  switch (statusCode) {
    case DisconnectReason.loggedOut:
      return 'logged out';
    case DisconnectReason.connectionReplaced:
      return 'replaced by another WhatsApp session';
    case DisconnectReason.badSession:
      return 'bad session';
    case DisconnectReason.multideviceMismatch:
      return 'multi-device mismatch';
    case DisconnectReason.forbidden:
      return 'forbidden by WhatsApp';
    case DisconnectReason.restartRequired:
      return 'restart required';
    case DisconnectReason.connectionClosed:
      return 'connection closed';
    case DisconnectReason.connectionLost:
      return 'connection lost';
    case DisconnectReason.timedOut:
      return 'timed out';
    case DisconnectReason.unavailableService:
      return 'service unavailable';
    default:
      return statusCode ? `status ${statusCode}` : 'unknown reason';
  }
}

async function scheduleReconnect(reason: string) {
  if (shuttingDown) {
    return;
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`[Baileys] Stopped reconnecting after ${MAX_RECONNECT_ATTEMPTS} attempts: ${reason}`);
    return;
  }

  clearReconnectTimer();
  const delay = getReconnectDelay(reconnectAttempts);
  reconnectAttempts += 1;

  console.log(`[Baileys] Reconnecting in ${Math.round(delay / 1000)}s (${reason})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void startWhatsAppBridge();
  }, delay);
}

async function startWhatsAppBridge() {
  if (shuttingDown) {
    return;
  }

  if (connectInFlight) {
    return connectInFlight;
  }

  connectInFlight = (async () => {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['TADAPAY Eve', 'Chrome', '1.0'],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      fireInitQueries: false,
    });

    activeSocket = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async update => {
      if (update.qr) {
        console.log(await QRCode.toString(update.qr, { type: 'terminal', small: true }));
      }

      if (update.connection === 'open') {
        reconnectAttempts = 0;
        clearReconnectTimer();
        console.log('[Baileys] WhatsApp connection established');
      }

      if (update.connection === 'close') {
        const statusCode = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
          ?.output?.statusCode;

        activeSocket = null;
        console.log(`[Baileys] Connection closed (${describeDisconnect(statusCode)})`);

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('[Baileys] Logged out. Delete .baileys-auth and reconnect to scan a new QR code.');
          return;
        }

        if (statusCode === DisconnectReason.connectionReplaced) {
          console.log('[Baileys] Another WhatsApp session replaced this one. Close the other session or remove .baileys-auth and pair again.');
          return;
        }

        if (statusCode === DisconnectReason.badSession || statusCode === DisconnectReason.multideviceMismatch) {
          console.log('[Baileys] Session looks stale. Delete .baileys-auth and pair again.');
          return;
        }

        if (shouldReconnect(statusCode)) {
          await scheduleReconnect(describeDisconnect(statusCode));
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') {
        return;
      }

      for (const inbound of messages) {
        if (inbound.key.fromMe) {
          continue;
        }

        const remoteJid = inbound.key.remoteJid;
        if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) {
          continue;
        }

        const phoneNumber = normalizeWhatsAppNumber(remoteJid);
        const messageText = extractWhatsAppText(inbound.message as Record<string, unknown> | undefined);

        if (!phoneNumber || !messageText) {
          continue;
        }

        try {
          const { replyText } = await processWhatsAppInboundMessage({
            phoneNumber,
            message: messageText,
          });

          if (replyText) {
            await sock.sendMessage(remoteJid, { text: replyText });
          }
        } catch (error) {
          console.error('[Baileys] Failed to process inbound message:', error);

          try {
            await sock.sendMessage(remoteJid, {
              text: '❌ I could not process that message right now. Please try again.',
            });
          } catch (sendError) {
            console.error('[Baileys] Failed to send fallback reply:', sendError);
          }
        }
      }
    });

  })().finally(() => {
    connectInFlight = null;
  });

  return connectInFlight;
}

function registerShutdownHandler() {
  if (shutdownHandlerRegistered) {
    return;
  }

  shutdownHandlerRegistered = true;

  process.once('SIGINT', () => {
    shuttingDown = true;
    clearReconnectTimer();
    console.log('[Baileys] Shutting down...');
    activeSocket?.end(undefined);
  });
}

registerShutdownHandler();
void startWhatsAppBridge().catch(error => {
  console.error('[Baileys] Fatal startup error:', error);
  process.exitCode = 1;
});
