import { defineTool } from "eve/tools";
import { z } from "zod";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export default defineTool({
  description: "Fetch the user's recent transaction history. Call when they ask about past purchases, last top-up, or spending.",
  inputSchema: z.object({
    limit: z.string().default("5").describe("How many transactions to show, 1 to 10"),
  }),
  async execute(input, ctx) {
    const userId =
      ctx.session.auth.current?.principalId ||
      (process.env.NODE_ENV !== 'production' ? process.env.TEST_USER_ID : undefined);
    if (!userId) return { status: false, message: "Could not identify your account." };

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
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!res.ok) return { status: false, message: "Failed to fetch transactions." };

      const rows = await res.json() as Array<{ type: string; amount: number; status: string; description: string; created_at: string; network?: string; phone_number?: string }>;
      if (!rows?.length) return { status: true, transactions: [], message: "No transactions found." };

      return {
        status: true,
        transactions: rows.map((tx) => {
          // Debit amounts are stored as negative numbers (atomic_debit inserts
          // -p_amount). Show "+" for credits/deposits, "-" for debits so
          // users can clearly tell the direction of each transaction.
          const absAmount = Math.abs(tx.amount ?? 0);
          const sign = (tx.amount ?? 0) >= 0 ? "+" : "-";
          return {
            type: tx.type,
            amount: `${sign}₦${absAmount.toLocaleString("en-NG")}`,
            status: tx.status,
            description: tx.description,
            network: tx.network,
            phone: tx.phone_number,
            date: new Date(tx.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }),
          };
        }),
      };
    } catch {
      return { status: false, message: "Could not fetch transaction history." };
    }
  },
});
