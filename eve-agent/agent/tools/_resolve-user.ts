/**
 * _resolve-user.ts
 *
 * Shared utility for Eve tools: resolves a raw WhatsApp identifier to a
 * Supabase UUID before any user-scoped operation.
 *
 * Why this exists:
 *   Eve's principalId comes from the x-tada-user-id header, which the
 *   WhatsApp bot sets to the JID prefix. WhatsApp uses two JID formats:
 *     Real phone: 2349063546728@s.whatsapp.net → principalId = "2349063546728"
 *     LID:        62028370673687@lid           → principalId = "62028370673687"
 *
 *   All user-scoped tables (profiles, transactions, wallet) use Supabase UUIDs
 *   as the primary key. Passing a LID or phone number directly fails silently.
 *
 * This function handles all three input shapes:
 *   UUID  → returned as-is (no round-trip needed)
 *   phone → looked up via profiles.whatsapp_number
 *   LID   → looked up via profiles.whatsapp_lid
 *
 * Not exported as a `defineTool` so Eve won't try to register it as an agent tool.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a WhatsApp LID, phone number, or Supabase UUID to a Supabase UUID.
 *
 * @returns UUID string if a matching profile exists, `null` otherwise.
 */
export async function resolveToUuid(
  raw: string | null | undefined
): Promise<string | null> {
  if (!raw) return null;
  if (UUID_RE.test(raw)) return raw; // already a UUID — skip the lookup

  const normalised = raw.replace(/^\+/, ""); // strip leading + if present

  // One REST call: OR across whatsapp_number (phone) and whatsapp_lid (LID)
  const params = new URLSearchParams({
    or: `(whatsapp_number.eq.${normalised},whatsapp_lid.eq.${normalised})`,
    select: "id",
    limit: "1",
  });

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?${params.toString()}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!res.ok) {
      console.error(
        `[resolve-user] Supabase lookup failed (HTTP ${res.status})`
      );
      return null;
    }

    const rows = (await res.json()) as Array<{ id: string }>;
    return rows[0]?.id ?? null;
  } catch (err) {
    console.error("[resolve-user] Lookup error:", err);
    return null;
  }
}

/** Standard "no account" error result — returned by tools when userId can't be resolved. */
export const NO_ACCOUNT_ERROR = {
  status: false,
  message:
    "No TADAPAY account is linked to your WhatsApp number. " +
    "Please register in the app first.",
} as const;
