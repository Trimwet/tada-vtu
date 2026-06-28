import { defineTool } from "eve/tools";
import { z } from "zod";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Matches a Supabase UUID — anything else is a phone number or WhatsApp LID.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a raw WhatsApp identifier (LID or phone number) to a Supabase UUID.
 * Returns null if no matching profile is found.
 *
 * Why: Eve's principalId is set from the x-tada-user-id header which the
 * WhatsApp bot sends as the JID prefix — either a real phone (2349063546728)
 * or a WhatsApp Linked ID (62028370673687). Both need to resolve to a UUID
 * before querying user-scoped tables.
 */
async function resolveToUuid(raw: string): Promise<string | null> {
  if (UUID_RE.test(raw)) return raw; // already a UUID, skip lookup

  // Strip leading + if present (some callers normalise phone numbers)
  const normalised = raw.replace(/^\+/, "");

  // Single REST call: check whatsapp_number (real phone) and whatsapp_lid (LID)
  const url = `${SUPABASE_URL}/rest/v1/profiles?or=(whatsapp_number.eq.${normalised},whatsapp_lid.eq.${normalised})&select=id&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

export default defineTool({
  description:
    "Fetch the user's recent transaction history. Call when they ask about past purchases, last top-up, or spending.",
  inputSchema: z.object({
    limit: z
      .string()
      .default("5")
      .describe("How many transactions to show, 1 to 10"),
  }),
  async execute(input, ctx) {
    const rawId =
      ctx.session.auth.current?.principalId ||
      (process.env.NODE_ENV !== "production"
        ? process.env.TEST_USER_ID
        : undefined);

    if (!rawId) {
      return { status: false, message: "Could not identify your account." };
    }

    // Resolve LID / phone → Supabase UUID before querying user-scoped tables.
    const userId = await resolveToUuid(rawId);
    if (!userId) {
      return {
        status: false,
        message:
          "No TADAPAY account is linked to your WhatsApp number. " +
          "Please register or link your number in the app.",
      };
    }

    const limit = Math.min(Math.max(parseInt(input.limit) || 5, 1), 10);

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/transactions?user_id=eq.${userId}&order=created_at.desc&limit=${limit}&select=type,amount,status,description,created_at,network,phone_number`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        }
      );

      if (!res.ok) {
        return { status: false, message: "Failed to fetch transactions." };
      }

      const rows = (await res.json()) as Array<{
        type: string;
        amount: number;
        status: string;
        description: string;
        created_at: string;
        network?: string;
        phone_number?: string;
      }>;

      if (!rows?.length) {
        return { status: true, transactions: [], message: "No transactions found yet." };
      }

      return {
        status: true,
        transactions: rows.map((tx) => {
          // Debit amounts are stored negative (atomic_debit inserts -p_amount).
          const absAmount = Math.abs(tx.amount ?? 0);
          const sign = (tx.amount ?? 0) >= 0 ? "+" : "-";
          return {
            type: tx.type,
            amount: `${sign}₦${absAmount.toLocaleString("en-NG")}`,
            status: tx.status,
            description: tx.description,
            network: tx.network,
            phone: tx.phone_number,
            date: new Date(tx.created_at).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          };
        }),
      };
    } catch {
      return {
        status: false,
        message: "Could not fetch transaction history. Please try again.",
      };
    }
  },
});
