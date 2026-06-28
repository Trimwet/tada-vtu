/**
 * seed-baileys-session.ts
 *
 * ONE-TIME migration script.
 * Reads your local .baileys-auth directory and uploads the entire session
 * as a single JSONB blob to Supabase (baileys_sessions table, id = 'default').
 *
 * Run this ONCE from your local machine BEFORE deploying to Render:
 *   bun run whatsapp:seed
 *
 * The script is idempotent — running it again safely overwrites the row.
 *
 * ── Why the two-pass parse matters ───────────────────────────────────────────
 * creds.json stores keys as { type: "Buffer", data: "<base64>" }.
 * If we pass those plain objects straight through BufferJSON.replacer it sees
 * { type: "Buffer" } and does Buffer.from(data) — treating the base64 STRING
 * as UTF-8 bytes, which corrupts every key (length 44 instead of 32).
 *
 * Fix: parse each file with BufferJSON.reviver first → real Buffer instances →
 * then BufferJSON.replacer encodes them correctly for Supabase storage.
 */

import fs from 'node:fs';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { BufferJSON } from 'baileys';

// ── Config ─────────────────────────────────────────────────────────────────────

const AUTH_DIR = path.resolve(process.cwd(), '.baileys-auth');
const SESSION_ID = 'default';
const TABLE = 'baileys_sessions';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

// ── Supabase client ────────────────────────────────────────────────────────────

const supabase = createClient(
  requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
);

// ── Read auth dir with correct Buffer revival ──────────────────────────────────

function readAuthDir(): { creds: unknown; keys: Record<string, unknown> } {
  if (!fs.existsSync(AUTH_DIR)) {
    throw new Error(`Auth directory not found: ${AUTH_DIR}`);
  }

  const files = fs.readdirSync(AUTH_DIR).filter(f => f.endsWith('.json'));
  console.log(`[seed] Found ${files.length} files in ${AUTH_DIR}`);

  const credsFile = path.join(AUTH_DIR, 'creds.json');
  if (!fs.existsSync(credsFile)) {
    throw new Error(`creds.json not found in ${AUTH_DIR}`);
  }

  // ── CRITICAL: parse with BufferJSON.reviver to get real Buffer instances ──
  // Without this, { type: 'Buffer', data: '<base64>' } stays a plain object.
  // BufferJSON.replacer then corrupts it by treating the base64 string as UTF-8.
  const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'), BufferJSON.reviver) as unknown;
  console.log('[seed] ✅ creds.json read and revived');

  const keys: Record<string, unknown> = {};
  let keyCount = 0;

  for (const file of files) {
    if (file === 'creds.json') continue;
    const flatKey = file.replace(/\.json$/, '');
    try {
      // Same reviver here — pre-keys, sessions, etc. also contain Buffer fields.
      const content = JSON.parse(
        fs.readFileSync(path.join(AUTH_DIR, file), 'utf8'),
        BufferJSON.reviver,
      ) as unknown;
      keys[flatKey] = content;
      keyCount++;
    } catch (err) {
      console.warn(`[seed] ⚠️  Skipping ${file}: ${(err as Error).message}`);
    }
  }

  console.log(`[seed] ✅ ${keyCount} signal keys revived`);
  return { creds, keys };
}

// ── Upload ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('[seed] 🌱 Starting session migration…\n');

  const { creds, keys } = readAuthDir();

  // Encode: real Buffer instances → { type: 'Buffer', data: '<base64>' }
  // This is the correct round-trip; reviver will restore them on the bot side.
  const payload = JSON.parse(
    JSON.stringify({ creds, keys }, BufferJSON.replacer),
  ) as Record<string, unknown>;

  console.log('[seed] Uploading to Supabase…');
  const { error } = await supabase.from(TABLE).upsert(
    { id: SESSION_ID, data: payload, updated_at: new Date().toISOString() },
    { onConflict: 'id' },
  );

  if (error) throw new Error(`Upsert failed: ${error.message}`);

  // Verify
  const { data: row, error: fetchErr } = await supabase
    .from(TABLE)
    .select('id, updated_at')
    .eq('id', SESSION_ID)
    .single();

  if (fetchErr || !row) throw new Error(`Verification failed: ${fetchErr?.message ?? 'row not found'}`);

  const r = row as { id: string; updated_at: string };
  console.log(`\n[seed] ✅ SUCCESS`);
  console.log(`       Row id      : ${r.id}`);
  console.log(`       Updated at  : ${r.updated_at}`);
  console.log(`       Signal keys : ${Object.keys(keys).length}`);
  console.log('\n[seed] Next step: trigger a Render redeploy.');
}

seed().catch(err => {
  console.error('\n[seed] ❌ Fatal:', err);
  process.exit(1);
});
