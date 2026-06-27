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
import { useSupabaseAuthState } from "./supabase-auth.ts";

// ─── Config ──────────────────────────────────────────────────────────────────

const NEXT_APP_URL = process.env.NEXT_APP_URL ?? "http://localhost:3000";
const CORE_SECRET = process.env.CORE_SECRET ?? "";
const BOT_PHONE = process.env.BOT_PHONE ?? ""; // e.g. "2347058748217"

// Reconnect settings
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 2_000;

// ─── Eve agent bridge ─────────────────────────────────────────────────────────

// Cache continuation tokens per user so Eve can resume the same session.
// Key: senderPhone, Value: { token, expiresAt }
const eveTokens = new Map<string, { token: string; expiresAt: number }>();
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity → new session

function getToken(phone: string): string | undefined {
  const entry = eveTokens.get(phone);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    eveTokens.delete(phone);
    return undefined;
  }
  return entry.token;
}

function setToken(phone: string, token: string) {
  eveTokens.set(phone, { token, expiresAt: Date.now() + TOKEN_TTL_MS });
}

async function askEve(
  message: string,
  senderPhone: string,
  conversationId: string
): Promise<string> {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${CORE_SECRET}`,
    "x-tada-user-id": senderPhone,
  };

  try {
    // Step 1 — create or resume session (pass continuation token if we have one)
    const existingToken = getToken(senderPhone);
    const startBody: Record<string, string> = { message };
    if (existingToken) {
      startBody.token = existingToken;
    } else {
      startBody.conversationId = conversationId;
    }

    const startRes = await fetch(`${NEXT_APP_URL}/eve/v1/session`, {
      method: "POST",
      headers,
      body: JSON.stringify(startBody),
    });

    if (!startRes.ok) {
      const text = await startRes.text().catch(() => "");
      console.error(`[eve-bridge] session start HTTP ${startRes.status}:`, text);
      return "❌ Sorry, I ran into an issue. Please try again in a moment.";
    }

    const startJson = (await startRes.json()) as { sessionId: string; continuationToken?: string };
    const { sessionId } = startJson;
    // Save the continuation token for the next message from this user
    if (startJson.continuationToken) {
      setToken(senderPhone, startJson.continuationToken);
    }
    console.log(`[eve-bridge] session ${existingToken ? "resumed" : "started"}: ${sessionId}`);

    // Step 2 — stream the response
    const streamRes = await fetch(
      `${NEXT_APP_URL}/eve/v1/session/${sessionId}/stream`,
      { headers }
    );

    if (!streamRes.ok || !streamRes.body) {
      console.error(`[eve-bridge] stream HTTP ${streamRes.status}`);
      return "❌ Sorry, I ran into an issue. Please try again in a moment.";
    }

    // Collect Eve's NDJSON stream and extract the final message from step.completed
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalMessage = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed) as { type: string; data: Record<string, unknown>; continuationToken?: string };
          // Grab updated continuation token from any event that carries one
          if (event.continuationToken) {
            setToken(senderPhone, event.continuationToken);
          }
          // step.completed: capture text from ANY step (tool-call steps may have no message;
          // the LLM's final response step will have data.message)
          if (event.type === "step.completed" && typeof event.data?.message === "string" && event.data.message) {
            finalMessage = event.data.message as string;
          }
          // turn.completed may carry the assembled turn message
          if (event.type === "turn.completed" && typeof (event.data as any)?.message === "string" && (event.data as any).message) {
            finalMessage = (event.data as any).message as string;
          }
          // message.appended: keep updating so we always have the latest partial
          if (event.type === "message.appended" && typeof event.data?.messageSoFar === "string" && event.data.messageSoFar) {
            finalMessage = event.data.messageSoFar as string;
          }
        } catch {
          // non-JSON line, skip
        }
      }
    }

    if (!finalMessage) {
      console.error("[eve-bridge] no text extracted from stream");
      return "❌ Something went wrong. Please try again.";
    }

    console.log(`[eve-bridge] reply: ${finalMessage.slice(0, 100)}`);
    return finalMessage;

  } catch (err) {
    console.error("[eve-bridge] Fetch error:", err);
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
      // makeCacheableSignalKeyStore adds an in-memory LRU layer on top of our store.
      keys: makeCacheableSignalKeyStore(state.keys, undefined),
    },
    printQRInTerminal: false, // We'll do it ourselves for clarity.
    browser: ["TADAPAY Bot", "Chrome", "1.0.0"],
    generateHighQualityLinkPreview: false,
    // Keep the socket quiet — only log warnings and above.
    logger: { level: "warn", child: () => ({ level: "warn", child: () => {}, trace: () => {}, debug: () => {}, info: () => {}, warn: console.warn, error: console.error, fatal: console.error }) as never, trace: () => {}, debug: () => {}, info: () => {}, warn: console.warn, error: console.error, fatal: console.error } as never,
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
      // Prefer the real phone number JID (s.whatsapp.net) over the LID.
      // msg.key.participant is set in groups; for DMs the remoteJid IS the phone JID.
      const phoneJid =
        msg.key.participant ?? // group sender
        (senderJid.endsWith("@s.whatsapp.net") ? senderJid : null) ?? // DM phone jid
        senderJid; // fallback (lid)
      const senderPhone = jidToPhone(phoneJid);

      // Use the chat JID as the conversation ID for context continuity.
      const conversationId = senderJid;

      console.log(`[bot] 📩 ${senderPhone}: ${text.slice(0, 80)}`);

      // Show typing indicator.
      await sock.sendPresenceUpdate("composing", senderJid).catch(() => {});

      const reply = await askEve(text, senderPhone, conversationId);

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
