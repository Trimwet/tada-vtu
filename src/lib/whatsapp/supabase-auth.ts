/**
 * useSupabaseAuthState
 *
 * Drop-in replacement for Baileys' useMultiFileAuthState that persists the
 * WhatsApp session (creds + signal keys) as a single JSONB blob in Supabase.
 *
 * This lets the bot run on stateless hosts (Render free tier, Railway, etc.)
 * without needing a persistent filesystem. Once the user scans a QR code once,
 * the session lives in Supabase forever and survives every cold start.
 *
 * Design notes:
 * - All state is kept in memory (same as useMultiFileAuthState).
 * - Writes to Supabase are debounced (500 ms trailing edge) to avoid hammering
 *   the DB on every message exchange (Baileys fires saveCreds very frequently).
 * - BufferJSON.replacer/reviver handles the Buffer instances inside creds/keys.
 * - proto.Message.AppStateSyncKeyData.fromObject mirrors what useMultiFileAuthState
 *   does for that specific key type.
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
    throw new Error(`[SupabaseAuth] Failed to fetch session: ${fetchError.message}`);
  }

  // Supabase returns JSONB as a plain JS object. Re-serialize so BufferJSON.reviver
  // can restore any Buffer instances that were stored as { type:'Buffer', data:[...] }.
  const blob: { creds?: AuthenticationCreds; keys?: Record<string, unknown> } = row?.data
    ? (JSON.parse(JSON.stringify(row.data), BufferJSON.reviver) as typeof blob)
    : {};

  // ── In-memory state ────────────────────────────────────────────────────────
  const creds: AuthenticationCreds = blob.creds ?? initAuthCreds();

  // Keys are stored flat: "<type>-<id>" → value
  const keysFlat: Record<string, unknown> = blob.keys ?? {};

  // ── Debounced flush ────────────────────────────────────────────────────────
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush(): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void (async () => {
        try {
          // Serialize with BufferJSON.replacer so Buffers survive the round-trip
          const payload = JSON.parse(
            JSON.stringify({ creds, keys: keysFlat }, BufferJSON.replacer),
          ) as Record<string, unknown>;

          const { error: upsertError } = await supabase.from(TABLE).upsert({
            id: SESSION_ID,
            data: payload,
            updated_at: new Date().toISOString(),
          });

          if (upsertError) {
            console.error('[SupabaseAuth] Flush failed:', upsertError.message);
          }
        } catch (err) {
          console.error('[SupabaseAuth] Flush error:', err);
        }
      })();
    }, FLUSH_DEBOUNCE_MS);
  }

  // ── Signal key store ───────────────────────────────────────────────────────
  const keys: SignalKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      for (const id of ids) {
        let value = keysFlat[`${type}-${id}`] as SignalDataTypeMap[T] | undefined;

        // Mirror what useMultiFileAuthState does for this key type
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value) as SignalDataTypeMap[T];
        }

        if (value !== undefined) {
          result[id] = value;
        }
      }
      return result;
    },

    set: async (data) => {
      for (const category in data) {
        const categoryData = data[category] as Record<string, SignalDataTypeMap[keyof SignalDataTypeMap] | null>;
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
      scheduleFlush();
    },
  };

  return {
    state: { creds, keys },
    // saveCreds is called by Baileys on creds.update — the creds object is
    // mutated in-place by Baileys before this fires, so scheduleFlush picks
    // up the latest value automatically.
    saveCreds: async () => {
      scheduleFlush();
    },
  };
}
