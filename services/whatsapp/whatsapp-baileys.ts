/**
 * whatsapp-baileys.ts
 *
 * Main WhatsApp bot. Connects Baileys → Eve agent (via NEXT_APP_URL API routes).
 *
 * Lifecycle (mirrors the architecture diagram):
 *   1. Load session from Supabase (or show QR on first run).
 *   2. Receive messages → call Eve agent → reply.
 *   3. Disconnect: 401 → log + exit (admin must delete row & re-scan).
 *                  other → exponential backoff reconnect, reload session.
 */

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
  type WAMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { useSupabaseAuthState } from "./supabase-auth.ts";

// Shared logger — warn level keeps logs clean; Baileys internals need a real pino instance.
const logger = pino({ level: "warn" });

// ─── Config ──────────────────────────────────────────────────────────────────

const NEXT_APP_URL = process.env.NEXT_APP_URL ?? "http://localhost:3000";
const CORE_SECRET = process.env.CORE_SECRET ?? "";
const BOT_PHONE = process.env.BOT_PHONE ?? ""; // e.g. "2347058748217"

// Reconnect settings
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 2_000;

// ─── Eve agent bridge ───────────────────────────────────────────────────────
// Calls bridge.ts on the Next.js app which handles user lookup + Eve reply.
// One POST, one response — no streaming, no session tokens.

async function askEve(
  message: string,
  senderPhone: string,
): Promise<string> {
  try {
    const res = await fetch(`${NEXT_APP_URL}/api/whatsapp/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-core-secret": CORE_SECRET,
      },
      body: JSON.stringify({ phoneNumber: senderPhone, message }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[bot] bridge HTTP ${res.status}:`, body.slice(0, 200));
      return "❌ Sorry, I ran into an issue. Please try again in a moment.";
    }

    const json = await res.json() as { replyText?: string; error?: string };
    if (!json.replyText) {
      console.error("[bot] bridge returned no replyText:", JSON.stringify(json));
      return "❌ Something went wrong. Please try again.";
    }

    return json.replyText;
  } catch (err) {
    console.error("[bot] bridge fetch error:", err);
    return "❌ Could not reach the assistant. Please try again shortly.";
  }
}

// ─── Phone number helpers ─────────────────────────────────────────────────────

function jidToPhone(jid: string): string {
  // "2347012345678@s.whatsapp.net" → "2347012345678"
  return jid.split("@")[0].split(":")[0];
}

function extractText(msg: WAMessage): string | null {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    null
  );
}

// ─── Main connection loop ─────────────────────────────────────────────────────

async function connect(attempt = 0): Promise<void> {
  console.log(
    `[bot] Connecting… (attempt ${attempt + 1}/${MAX_RETRIES + 1})`
  );

  // Always reload session from Supabase on reconnect — it may have been updated.
  const { state, saveCreds } = await useSupabaseAuthState();
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      // Pass the pino logger — Baileys' auth-utils.js calls logger.trace() internally
      // and crashes with "undefined is not an object" if the logger is missing.
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false, // We'll do it ourselves for clarity.
    browser: ["TADAPAY Bot", "Chrome", "1.0.0"],
    generateHighQualityLinkPreview: false,
    // Skip the full chat/contact history sync on startup.
    // This prevents the "Timed Out in init queries" noise on Render's free tier
    // where network latency causes Baileys' sync requests to time out.
    // The bot only needs to receive/send messages — it doesn't need chat history.
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    getMessage: async () => undefined,
    logger,
    markOnlineOnConnect: false,
  });

  // ── QR code ────────────────────────────────────────────────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(
        "\n[bot] 📱 Scan this QR with WhatsApp (Linked Devices → Link a Device):\n"
      );
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("[bot] ✅ Connected to WhatsApp.");
      // Reset retry counter on successful connection.
    }

    if (connection === "close") {
      const boom = lastDisconnect?.error as Boom | undefined;
      const code = boom?.output?.statusCode;

      // 401 = logged out / session invalidated. NEVER retry.
      if (code === DisconnectReason.loggedOut) {
        console.error(
          "[bot] ❌ WhatsApp returned 401 (logged out). " +
            "Delete the Supabase row (id = 'default') and re-deploy to re-scan QR."
        );
        process.exit(1); // Clean exit — Render will not restart (ON_FAILURE only).
      }

      // Any other error → exponential backoff reconnect.
      if (attempt >= MAX_RETRIES) {
        console.error(`[bot] 💀 Max retries (${MAX_RETRIES}) reached. Exiting.`);
        process.exit(1);
      }

      const delay = BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `[bot] ⚠️  Disconnected (code ${code}). Retrying in ${delay}ms…`
      );
      setTimeout(() => connect(attempt + 1), delay);
    }
  });

  // ── Persist credentials whenever Baileys updates them ─────────────────────
  sock.ev.on("creds.update", saveCreds);

  // ── Message handler ────────────────────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return; // Ignore history / sync messages.

    for (const msg of messages) {
      // Skip: no key, sent by us, broadcast, or status updates.
      if (!msg.key || msg.key.fromMe) continue;
      if (!msg.key.remoteJid) continue;
      if (isJidBroadcast(msg.key.remoteJid)) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;

      const text = extractText(msg);
      if (!text?.trim()) continue;

      const senderJid = msg.key.remoteJid;

      // ── Resolve the real phone number ──────────────────────────────────────
      // Baileys on newer WhatsApp versions delivers DMs with a LID (@lid) as
      // remoteJid instead of the real phone JID (@s.whatsapp.net).
      // The real phone is exposed in several fallback locations — try them all:
      //   1. msg.key.remoteJidAlt  — set by Baileys when addressingMode="lid"
      //   2. msg.message?.senderKeyDistributionMessage (rare)
      //   3. msg.key.participant   — real sender in group messages
      //   4. remoteJid itself      — already a phone JID (older clients)
      //   5. Last resort: use the LID digits (won't match Supabase, but at
      //      least avoids crashing)
      const key = msg.key as Record<string, unknown>;
      const msgAttrs = (msg as unknown as Record<string, unknown>).messageStubParameters
        ?? (msg as unknown as Record<string, unknown>).messageTimestamp; // unused, just for type

      // remoteJidAlt is populated when Baileys knows the real JID alongside the LID
      const remoteJidAlt = (key.remoteJidAlt as string | undefined)
        ?? (key.participant as string | undefined);

      // sender_pn comes from message attributes logged by Baileys internals
      // It's accessible via the raw message object under various paths:
      const rawMsg = msg as unknown as {
        key: { remoteJidAlt?: string; participant?: string };
        verifiedBizName?: string;
      };

      const phoneJid =
        (rawMsg.key.remoteJidAlt?.endsWith("@s.whatsapp.net") ? rawMsg.key.remoteJidAlt : null) ??
        (senderJid.endsWith("@s.whatsapp.net") ? senderJid : null) ??
        (rawMsg.key.participant?.endsWith("@s.whatsapp.net") ? rawMsg.key.participant : null) ??
        senderJid; // last resort — LID or whatever we have

      const senderPhone = jidToPhone(phoneJid);

      // Log clearly so we can see which path resolved the phone
      const resolvedVia = phoneJid === rawMsg.key.remoteJidAlt ? "remoteJidAlt"
        : phoneJid === senderJid ? (senderJid.includes("@lid") ? "LID-fallback" : "remoteJid")
        : phoneJid === rawMsg.key.participant ? "participant"
        : "unknown";
      if (resolvedVia === "LID-fallback") {
        console.warn(`[bot] ⚠️  Using LID as phone — user lookup will fail. LID: ${senderJid}`);
      }

      // Use the chat JID as the conversation ID for context continuity.
      const conversationId = senderJid;

      console.log(`[bot] 📩 ${senderPhone}: ${text.slice(0, 80)}`);

      // Show typing indicator.
      await sock.sendPresenceUpdate("composing", senderJid).catch(() => {});

      const reply = await askEve(text, senderPhone);

      await sock
        .sendMessage(senderJid, { text: reply }, { quoted: msg })
        .catch((err: unknown) =>
          console.error("[bot] Failed to send message:", err)
        );

      await sock.sendPresenceUpdate("paused", senderJid).catch(() => {});
      console.log(`[bot] 📤 → ${senderPhone}: ${reply.slice(0, 80)}`);
    }
  });
}

// ─── Health check endpoint (for UptimeRobot / Render) ───────────────────────
// A minimal HTTP server so UptimeRobot can ping /health and keep the container warm.

import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 3001);

createServer((req, res) => {
  if (req.url === "/health" && (req.method === "GET" || req.method === "HEAD")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", ts: Date.now() }));
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
}).listen(PORT, () => {
  console.log(`[bot] 🩺 Health endpoint → http://localhost:${PORT}/health`);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

connect().catch((err) => {
  console.error("[bot] Fatal startup error:", err);
  process.exit(1);
});
