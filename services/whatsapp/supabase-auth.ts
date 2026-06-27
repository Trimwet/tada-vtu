/**
 * supabase-auth.ts
 *
 * Replaces Baileys' useMultiFileAuthState with a Supabase JSONB blob.
 * One row in baileys_sessions (id = 'default') holds the full session.
 *
 * Key design decisions (all match the architecture diagram):
 *   - Supabase unreachable on startup → throw + exit. Never fall back to files.
 *   - No row → initAuthCreds (fresh session, QR will be shown).
 *   - Row exists → restore creds + keys via BufferJSON.reviver.
 *   - keys.set is debounced 200ms (signal ratchet fires many times per message).
 *   - saveCreds is immediate AND cancels any pending debounce (creds always win).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  initAuthCreds,
  BufferJSON,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "@whiskeysockets/baileys";

// ─── Types ───────────────────────────────────────────────────────────────────

type KeyType = keyof SignalDataTypeMap;

interface SessionBlob {
  creds: unknown;
  keys: Record<string, Record<string, unknown>>;
}

// ─── Supabase client (service role — bypasses RLS) ──────────────────────────

function makeSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "[supabase-auth] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SESSION_ID = "default";

async function loadBlob(
  supabase: SupabaseClient
): Promise<SessionBlob | null> {
  const { data, error } = await supabase
    .from("baileys_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();

  if (error) throw new Error(`[supabase-auth] Load failed: ${error.message}`);
  if (!data) return null;

  // Revive Buffer objects that Supabase stores as { type: 'Buffer', data: [...] }
  const raw = JSON.stringify(data.data);
  return JSON.parse(raw, BufferJSON.reviver) as SessionBlob;
}

async function saveBlob(
  supabase: SupabaseClient,
  blob: SessionBlob
): Promise<void> {
  // BufferJSON.replacer serialises Buffer objects correctly.
  const payload = JSON.parse(JSON.stringify(blob, BufferJSON.replacer));

  const { error } = await supabase.from("baileys_sessions").upsert(
    { id: SESSION_ID, data: payload, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );

  if (error) throw new Error(`[supabase-auth] Save failed: ${error.message}`);
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function useSupabaseAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  // STEP 1: Verify Supabase is reachable. Hard fail — never silently fall back.
  const supabase = makeSupabase();
  const healthCheck = await supabase
    .from("baileys_sessions")
    .select("id")
    .limit(1);
  if (healthCheck.error) {
    throw new Error(
      `[supabase-auth] Supabase unreachable: ${healthCheck.error.message}. ` +
        `Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`
    );
  }

  // STEP 2: Load existing session or start fresh.
  const existing = await loadBlob(supabase);

  // In-memory working copies (mutated by Baileys during the session).
  let creds: AuthenticationState["creds"] = existing
    ? (existing.creds as AuthenticationState["creds"])
    : initAuthCreds();

  // keys store: { [type]: { [id]: value } }
  const keyStore: Record<string, Record<string, unknown>> = existing
    ? existing.keys
    : {};

  // ─── Debounce state for keys.set ───────────────────────────────────────
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 200;

  async function flushToSupabase(): Promise<void> {
    debounceTimer = null;
    await saveBlob(supabase, { creds, keys: keyStore });
  }

  function scheduleFlush(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      flushToSupabase().catch((err) =>
        console.error("[supabase-auth] Debounced flush failed:", err)
      );
    }, DEBOUNCE_MS);
  }

  // ─── saveCreds: immediate + cancels any pending debounce ───────────────
  async function saveCreds(): Promise<void> {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    await saveBlob(supabase, { creds, keys: keyStore });
  }

  // ─── Baileys AuthenticationState ───────────────────────────────────────
  const state: AuthenticationState = {
    creds,
    keys: {
      get<T extends KeyType>(
        type: T,
        ids: string[]
      ): { [id: string]: SignalDataTypeMap[T] } {
        const bucket = keyStore[type] ?? {};
        return Object.fromEntries(
          ids
            .filter((id) => id in bucket)
            .map((id) => [id, bucket[id] as SignalDataTypeMap[T]])
        );
      },

      set(data: { [K in KeyType]?: { [id: string]: SignalDataTypeMap[K] | null } }): void {
        for (const [type, bucket] of Object.entries(data)) {
          if (!bucket) continue;
          for (const [id, value] of Object.entries(bucket)) {
            if (value == null) {
              // null means delete
              delete (keyStore[type] ??= {})[id];
            } else {
              (keyStore[type] ??= {})[id] = value;
            }
          }
        }
        scheduleFlush();
      },
    },
  };

  console.log(
    existing
      ? "[supabase-auth] ✅ Session restored from Supabase."
      : "[supabase-auth] 🆕 No session found — fresh start. QR will appear."
  );

  return { state, saveCreds };
}
