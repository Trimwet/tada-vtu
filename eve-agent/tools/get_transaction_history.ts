import { tool } from "eve";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default tool({
  description: "Get recent transaction history for the current user.",
  parameters: z.object({
    limit: z.string().optional().describe("How many to fetch, e.g. '5'. Max 10."),
  }),
  execute: async ({ limit }, { userId }) => {
    const uid = (userId as string) || process.env.TEST_USER_ID;
    if (!uid) return { error: "No user identified." };

    const count = Math.min(parseInt(limit || "5", 10) || 5, 10);
    const { data, error } = await supabase
      .from("transactions")
      .select("type, amount, status, description, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(count);

    if (error) return { error: "Failed to fetch transactions." };
    if (!data || data.length === 0) return { message: "No transactions found yet." };

    const lines = data.map((tx) => {
      const sign = tx.amount >= 0 ? "+" : "";
      const date = new Date(tx.created_at).toLocaleDateString("en-NG");
      return `${date} | ${tx.type} | ${sign}₦${Math.abs(tx.amount).toLocaleString()} | ${tx.status}`;
    });

    return { transactions: lines, count: data.length };
  },
});
