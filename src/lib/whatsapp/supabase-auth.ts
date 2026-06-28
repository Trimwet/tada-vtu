/**
 * useSupabaseAuthState
 *
 * Drop-in replacement for Baileys' useMultiFileAuthState that persists the
 * WhatsApp session (creds + signal keys) as a single JSONB blob in Supabase.
 *
 * Design:
 * - keys.set  → debounced 500 ms trailing-edge write (signal ratchet fires often)
 * - saveCreds → IMMEDIATE write; cancels any pending debounce first
 *               (creds update happens on QR scan / reconnect — must not be lost)
 *
 * Never falls back to file auth. If Supabase is unreachable the function
 * throws, which kills the process cleanly rather than silently degrading.
 */

import { createClient } from '@supabase/supabase-js';
import { BufferJSON, initAuthCreds, proto } from 'baileys';
import type { AuthenticationCreds, SignalDataTypeMap, SignalKeyStore } from 'baileys';

const TABLE = 'baileys_sessions';
const SESSION_ID = 'default';
const FLUSH_DEBOUNCE_MS = 500;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      '[SupabaseAuth] Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  return createClient(url, serviceKey);
}

export async function useSupabaseAuthState(): Promise<{
  state: { creds: AuthenticationCreds; keys: SignalKeyStore };
  saveCreds: () => Promise<void>;
}> {
  const supabase = getSupabaseAdmin();

  // ── Load existing session ──────────────────────────────────────────────────
  const { data: row, error: fetchError } = await supabase
    .from(TABLE)
    .select('data')
    .eq('id', SESSION_ID)
    .maybeSingle();

  if (fetchError) {
    // Never fall back to file auth — fail loudly so the process dies cleanly.
    throw new Error(
      `[SupabaseAuth] Cannot reach Supabase (${fetchError.message}). ` +
      `Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.`,
    );
  }

  // Supabase returns JSONB as a plain JS object. Re-serialize so
  // BufferJSON.reviver can restore Buffer instances stored as
  // { type: 'Buffer', data: [...] }.
  const blob: { creds?: AuthenticationCreds; keys?: Record<string, unknown> } = row?.data
    ? (JSON.parse(JSON.stringify(row.data), BufferJSON.reviver) as typeof blob)
    : {};

  // ── In-memory state ────────────────────────────────────────────────────────
  const creds: AuthenticationCreds = blob.creds ?? initAuthCreds();

  if (blob.creds) {
    console.log('[SupabaseAuth] Session restored from Supabase — no QR needed.');
  } else {
    console.log('[SupabaseAuth] No session found — QR code will print. Scan once to authenticate.');
  }

  // Keys stored flat: `${type}-${id}` → value
  const keysFlat: Record<string, unknown> = blob.keys ?? {};

  // ── Flush helpers ──────────────────────────────────────────────────────────
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  /** Write current creds + keys to Supabase right now. */
  async function flushNow(): Promise<void> {
    // Cancel any pending debounce — we're writing now.
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    try {
      const payload = JSON.parse(
        JSON.stringify({ creds, keys: keysFlat }, BufferJSON.replacer),
      ) as Record<string, unknown>;

      const { error: upsertError } = await supabase.from(TABLE).upsert(
        { id: SESSION_ID, data: payload, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      );

      if (upsertError) {
        console.error('[SupabaseAuth] Flush failed:', upsertError.message);
      }
    } catch (err) {
      console.error('[SupabaseAuth] Flush error:', err);
    }
  }

  /** Schedule a debounced flush — resets the 500 ms timer on every call. */
  function scheduleFlush(): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushNow();
    }, FLUSH_DEBOUNCE_MS);
  }

  // ── Signal key store ───────────────────────────────────────────────────────
  const keys: SignalKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      for (const id of ids) {
        let value = keysFlat[`${type}-${id}`] as SignalDataTypeMap[T] | undefined;

        // Mirror what useMultiFileAuthState does for this specific key type.
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(
            value as object,
          ) as SignalDataTypeMap[T];
        }

        if (value !== undefined) {
          result[id] = value;
        }
      }
      return result;
    },

    set: async (data) => {
      for (const category in data) {
        const categoryData = data[category] as Record<
          string,
          SignalDataTypeMap[keyof SignalDataTypeMap] | null
        >;
        for (const id in categoryData) {
          const value = categoryData[id];
          const flatKey = `${category}-${id}`;
          if (value != null) {
            keysFlat[flatKey] = value;
          } else {
            delete keysFlat[flatKey];
          }
        }
      }
      // Debounce — signal ratchet fires on every message exchange.
      scheduleFlush();
    },
  };

  return {
    state: { creds, keys },

    // saveCreds is called by Baileys on creds.update events (QR scan, reconnect,
    // key rotation). These are low-frequency but critical — flush immediately so
    // a container restart right after scan doesn't lose the session.
    saveCreds: flushNow,
  };
}
