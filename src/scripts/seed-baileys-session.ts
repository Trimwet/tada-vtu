/**
 * seed-baileys-session.ts
 *
 * ONE-TIME migration script.
 * Reads your local .baileys-auth directory and uploads the entire session
 * as a single JSONB blob to Supabase (baileys_sessions table, id = 'default').
 *
 * Run this ONCE from your local machine BEFORE deploying to Render:
 *   bun run src/scripts/seed-baileys-session.ts
 *
 * After running:
 *   1. Confirm the Supabase row exists (id = 'default').
 *   2. Deploy the bot to Render — it will pick up the session and reconnect
 *      WITHOUT showing a QR code.
 *
 * The script is idempotent — running it again overwrites the existing row.
 * It does NOT delete or modify the local .baileys-auth directory.
 */

import fs from 'node:fs';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { BufferJSON } from 'baileys';

// ── Config ─────────────────────────────────────────────────────────────────────

const AUTH_DIR = path.resolve(process.cwd(), '.baileys-auth');
const SESSION_ID = 'default';
const TABLE = 'baileys_sessions';

// Load env from .env.local if running locally.
// Bun automatically reads .env.local, so no dotenv import needed.

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

// ── Read all files in .baileys-auth ───────────────────────────────────────────

function readAuthDir(): { creds: unknown; keys: Record<string, unknown> } {
  if (!fs.existsSync(AUTH_DIR)) {
    throw new Error(`Auth directory not found: ${AUTH_DIR}\nRun the bot locally first to generate a session.`);
  }

  const files = fs.readdirSync(AUTH_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error(`No .json files found in ${AUTH_DIR}. The auth directory looks empty.`);
  }

  console.log(`[seed] Found ${files.length} files in ${AUTH_DIR}`);

  // creds.json is special — it's the credentials object.
  const credsFile = path.join(AUTH_DIR, 'creds.json');
  if (!fs.existsSync(credsFile)) {
    throw new Error(`creds.json not found in ${AUTH_DIR}. Is this a valid Baileys auth directory?`);
  }

  const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8')) as unknown;
  console.log('[seed] ✅ creds.json read');

  // All other files → flat key store.
  // supabase-auth.ts stores keys as: { [`${type}-${id}`]: value }
  // Baileys' useMultiFileAuthState names files: `${type}-${id}.json`
  // So we strip the .json extension and that IS the flat key.
  const keys: Record<string, unknown> = {};
  let keyCount = 0;

  for (const file of files) {
    if (file === 'creds.json') continue;

    const flatKey = file.replace(/\.json$/, ''); // e.g. "pre-key-1", "session-1972077863137_1.0"
    try {
      const content = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, file), 'utf8')) as unknown;
      keys[flatKey] = content;
      keyCount++;
    } catch (err) {
      console.warn(`[seed] ⚠️  Skipping ${file} (parse error): ${(err as Error).message}`);
    }
  }

  console.log(`[seed] ✅ ${keyCount} signal keys read`);
  return { creds, keys };
}

// ── Upload to Supabase ─────────────────────────────────────────────────────────

async function seed() {
  console.log('[seed] 🌱 Starting session migration to Supabase…\n');

  // 1. Read local auth directory.
  const { creds, keys } = readAuthDir();

  // 2. Serialise using BufferJSON.replacer so Buffer objects survive JSONB round-trip.
  const payload = JSON.parse(
    JSON.stringify({ creds, keys }, BufferJSON.replacer),
  ) as Record<string, unknown>;

  // 3. Upsert into Supabase.
  console.log('[seed] Uploading to Supabase…');
  const { error } = await supabase.from(TABLE).upsert(
    { id: SESSION_ID, data: payload, updated_at: new Date().toISOString() },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(`[seed] ❌ Supabase upsert failed: ${error.message}`);
  }

  // 4. Verify.
  const { data: row, error: fetchErr } = await supabase
    .from(TABLE)
    .select('id, updated_at')
    .eq('id', SESSION_ID)
    .single();

  if (fetchErr || !row) {
    throw new Error(`[seed] ❌ Verification failed: ${fetchErr?.message ?? 'row not found'}`);
  }

  console.log(`\n[seed] ✅ SUCCESS — session seeded to Supabase.`);
  console.log(`       Row id      : ${(row as { id: string }).id}`);
  console.log(`       Updated at  : ${(row as { updated_at: string }).updated_at}`);
  console.log(`       Signal keys : ${Object.keys(keys).length}`);
  console.log('\n[seed] Next steps:');
  console.log('  1. Deploy the bot to Render (git push or manual deploy).');
  console.log('  2. Check Render logs — you should see "Session restored from Supabase — no QR needed."');
  console.log('  3. Set up UptimeRobot to ping https://<your-render-url>/health every 5 minutes.');
}

seed().catch(err => {
  console.error('\n[seed] ❌ Fatal error:', err);
  process.exit(1);
});
