/**
 * seed-session.ts
 *
 * ONE-TIME migration script.
 * Reads the live .baileys-auth directory and writes a single consolidated
 * JSONB blob into the baileys_sessions table (row id = 'default').
 *
 * Run once, locally, BEFORE deploying to Render:
 *   cd tada-vtu/services/whatsapp
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun run seed-session.ts [--auth-dir ../../.baileys-auth]
 *
 * After a successful run, Render will pick up the session and reconnect
 * without showing a QR code.
 *
 * Safety: will refuse to overwrite an existing row unless --force is passed.
 */

import { createClient } from "@supabase/supabase-js";
import { BufferJSON } from "@whiskeysockets/baileys";
import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name: string): boolean {
  return args.includes(name);
}

function option(name: string, fallback: string): string {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const AUTH_DIR = option(
  "--auth-dir",
  join(process.cwd(), "..", "..", ".baileys-auth")
);
const FORCE = flag("--force");
const DRY_RUN = flag("--dry-run");
const SESSION_ID = option("--session-id", "default");

// ─── Supabase ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Baileys stores keys in files like:
 *   pre-key-1.json
 *   session-abc123.json
 *   sender-key-xyz.json
 *   app-state-sync-key-abc.json
 *   etc.
 *
 * The filename (without .json) IS the compound key used by the key store.
 * We rebuild the in-memory key map that supabase-auth.ts expects:
 *   { [type]: { [id]: value } }
 *
 * Key types Baileys uses:
 *   pre-key, session, sender-key, sender-key-memory,
 *   app-state-sync-key, app-state-sync-version
 */

const KEY_TYPES = [
  "pre-key",
  "session",
  "sender-key",
  "sender-key-memory",
  "app-state-sync-key",
  "app-state-sync-version",
] as const;

type KeyType = (typeof KEY_TYPES)[number];

function parseKeyFilename(filename: string): { type: KeyType; id: string } | null {
  // Match longest type first to avoid "pre-key" matching "pre-key-memory" wrong
  for (const type of KEY_TYPES.slice().sort((a, b) => b.length - a.length)) {
    if (filename.startsWith(type + "-") || filename === type) {
      const id = filename.startsWith(type + "-")
        ? filename.slice(type.length + 1)
        : "";
      return { type, id };
    }
  }
  return null;
}

async function readJson(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf-8");
  // Revive Buffer objects stored as { type: 'Buffer', data: [...] }
  return JSON.parse(raw, BufferJSON.reviver);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n📂 Reading Baileys auth from: ${AUTH_DIR}`);
  console.log(`🪣  Target session ID: ${SESSION_ID}`);
  if (DRY_RUN) console.log("🧪  DRY RUN — nothing will be written to Supabase.\n");

  // 1. Read creds.json
  const credsPath = join(AUTH_DIR, "creds.json");
  let creds: unknown;
  try {
    creds = await readJson(credsPath);
    console.log("✅  creds.json read OK");
  } catch (err) {
    console.error(`❌  Could not read ${credsPath}:`, err);
    process.exit(1);
  }

  // 2. Read all key files
  let allFiles: string[];
  try {
    allFiles = await readdir(AUTH_DIR);
  } catch (err) {
    console.error(`❌  Could not list ${AUTH_DIR}:`, err);
    process.exit(1);
  }

  const keyFiles = allFiles.filter(
    (f) => f.endsWith(".json") && f !== "creds.json"
  );

  console.log(`📋  Found ${keyFiles.length} key files.`);

  const keys: Record<string, Record<string, unknown>> = {};
  let loaded = 0;
  let skipped = 0;

  for (const filename of keyFiles) {
    const nameWithoutExt = basename(filename, ".json");
    const parsed = parseKeyFilename(nameWithoutExt);

    if (!parsed) {
      console.warn(`  ⚠️  Unrecognised key file (skipping): ${filename}`);
      skipped++;
      continue;
    }

    try {
      const value = await readJson(join(AUTH_DIR, filename));
      (keys[parsed.type] ??= {})[parsed.id] = value;
      loaded++;
    } catch {
      console.warn(`  ⚠️  Failed to parse ${filename} (skipping).`);
      skipped++;
    }
  }

  console.log(`  ✅  Loaded ${loaded} keys, skipped ${skipped}.`);

  // 3. Build the blob
  const blob = { creds, keys };

  // 4. Serialise with BufferJSON.replacer so Buffers round-trip correctly
  const payload = JSON.parse(JSON.stringify(blob, BufferJSON.replacer));

  if (DRY_RUN) {
    console.log("\n🧪  Dry-run complete. Blob summary:");
    console.log(`  creds keys: ${Object.keys(payload.creds as object).length}`);
    console.log(`  key types:  ${Object.keys(payload.keys).join(", ") || "(none)"}`);
    console.log("\nNo data written. Remove --dry-run to seed for real.");
    return;
  }

  // 5. Check for existing row
  const { data: existing, error: checkErr } = await supabase
    .from("baileys_sessions")
    .select("id, updated_at")
    .eq("id", SESSION_ID)
    .maybeSingle();

  if (checkErr) {
    console.error("❌  Supabase check failed:", checkErr.message);
    process.exit(1);
  }

  if (existing && !FORCE) {
    console.error(
      `\n❌  Row (id = '${SESSION_ID}') already exists in baileys_sessions.`
    );
    console.error(
      `   Last updated: ${existing.updated_at ?? "unknown"}`
    );
    console.error(
      "   Pass --force to overwrite, or delete the row manually first.\n"
    );
    process.exit(1);
  }

  if (existing && FORCE) {
    console.warn(`\n⚠️  --force: overwriting existing row for '${SESSION_ID}'.`);
  }

  // 6. Upsert
  const { error: upsertErr } = await supabase.from("baileys_sessions").upsert(
    { id: SESSION_ID, data: payload, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );

  if (upsertErr) {
    console.error("❌  Supabase upsert failed:", upsertErr.message);
    process.exit(1);
  }

  console.log(`\n🎉  Session seeded successfully → baileys_sessions (id = '${SESSION_ID}')`);
  console.log("   Deploy the WhatsApp service to Render — it will reconnect without a QR scan.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
