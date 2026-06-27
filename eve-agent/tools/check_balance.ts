import { tool } from "eve";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default tool({
  description: "Check the TADAPAY wallet balance for the current user.",
  parameters: z.object({}),
  execute: async (_, { userId }) => {
    const uid = (userId as string) || process.env.TEST_USER_ID;
    if (!uid) return { error: "No user identified. Please link your WhatsApp account first." };

    const { data, error } = await supabase
      .from("profiles")
      .select("balance, full_name")
      .eq("id", uid)
      .single();

    if (error || !data) return { error: "Failed to read wallet balance. Please try again." };

    return {
      balance: Number(data.balance).toFixed(2),
      full_name: data.full_name || "User",
      message: `Your TADAPAY wallet balance is ₦${Number(data.balance).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
    };
  },
});
