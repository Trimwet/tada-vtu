import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const base = "C:/Users/MAFUYAI/Documents/TADA VTU/tada-vtu/eve-agent";
mkdirSync(`${base}/tools`, { recursive: true });

writeFileSync(`${base}/agent.ts`, `import { defineAgent } from "eve";
import { groq } from "@ai-sdk/groq";

export default defineAgent({
  name: "Eve",
  description: "TADAPAY financial assistant — helps users check balance, buy airtime and data.",
  model: groq("llama-3.3-70b-versatile"),
  system: \`You are Eve, the TADAPAY AI assistant. You help users manage their wallet via WhatsApp.

You can: check wallet balance, buy airtime, buy data, show transaction history.

RULES:
- NEVER invent a balance. If check_balance fails, say so clearly.
- NEVER execute a purchase without showing details and asking for confirmation first.
- Always confirm network, phone number, and amount before buying anything.
- If a tool fails, report the failure honestly.
- Be concise — users are on WhatsApp.\`,
  tools: ["check_balance", "buy_airtime", "buy_data", "get_transaction_history", "get_data_plans"],
});
`);

writeFileSync(`${base}/tools/check_balance.ts`, `import { tool } from "eve";
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
      message: \`Your TADAPAY wallet balance is ₦\${Number(data.balance).toLocaleString("en-NG", { minimumFractionDigits: 2 })}\`,
    };
  },
});
`);

writeFileSync(`${base}/tools/get_transaction_history.ts`, `import { tool } from "eve";
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
      return \`\${date} | \${tx.type} | \${sign}₦\${Math.abs(tx.amount).toLocaleString()} | \${tx.status}\`;
    });

    return { transactions: lines, count: data.length };
  },
});
`);

writeFileSync(`${base}/tools/get_data_plans.ts`, `import { tool } from "eve";
import { z } from "zod";

export default tool({
  description: "Fetch available data plans for a given Nigerian network.",
  parameters: z.object({
    network: z.string().describe("Network name: MTN, Airtel, Glo, or 9mobile"),
  }),
  execute: async ({ network }) => {
    const base = process.env.NEXT_APP_URL || "http://localhost:3000";
    const res = await fetch(\`\${base}/api/data-plans?network=\${encodeURIComponent(network.toLowerCase())}\`);
    if (!res.ok) return { error: \`Could not fetch \${network} data plans.\` };

    const json = await res.json();
    const plans = (json.plans || json.data || json || []).slice(0, 8);
    if (!plans.length) return { message: \`No data plans found for \${network}.\` };

    const lines = plans.map((p: Record<string, string | number>) =>
      \`\${p.name || p.plan} — ₦\${p.price || p.amount} (\${p.validity || p.duration})\`
    );
    return { network, plans: lines };
  },
});
`);

writeFileSync(`${base}/tools/buy_airtime.ts`, `import { tool } from "eve";
import { z } from "zod";

export default tool({
  description: "Buy airtime for a Nigerian phone number. Always confirm with user before executing.",
  parameters: z.object({
    network: z.string().describe("MTN, Airtel, Glo, or 9mobile"),
    phone: z.string().describe("Nigerian phone number e.g. 08012345678"),
    amount: z.string().describe("Amount in naira e.g. 200"),
  }),
  needsApproval: true,
  execute: async ({ network, phone, amount }, { userId }) => {
    const uid = (userId as string) || process.env.TEST_USER_ID;
    if (!uid) return { error: "No user identified." };

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 50) return { error: "Minimum airtime purchase is ₦50." };

    const base = process.env.NEXT_APP_URL || "http://localhost:3000";
    const res = await fetch(\`\${base}/api/v1/airtime/buy\`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-core-secret": process.env.CORE_SECRET || "" },
      body: JSON.stringify({ network, phone, amount: numAmount, userId: uid }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === "error") return { error: json.message || "Airtime purchase failed." };

    return {
      success: true,
      message: \`✅ ₦\${numAmount} \${network} airtime sent to \${phone} successfully.\`,
      reference: json.data?.reference,
    };
  },
});
`);

writeFileSync(`${base}/tools/buy_data.ts`, `import { tool } from "eve";
import { z } from "zod";

export default tool({
  description: "Buy a data bundle for a Nigerian phone number. Always confirm before executing.",
  parameters: z.object({
    network: z.string().describe("MTN, Airtel, Glo, or 9mobile"),
    phone: z.string().describe("Nigerian phone number e.g. 08012345678"),
    planId: z.string().describe("Data plan ID from get_data_plans"),
    amount: z.string().describe("Plan cost in naira"),
  }),
  needsApproval: true,
  execute: async ({ network, phone, planId, amount }, { userId }) => {
    const uid = (userId as string) || process.env.TEST_USER_ID;
    if (!uid) return { error: "No user identified." };

    const base = process.env.NEXT_APP_URL || "http://localhost:3000";
    const res = await fetch(\`\${base}/api/v1/data/buy\`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-core-secret": process.env.CORE_SECRET || "" },
      body: JSON.stringify({ network, phone, planId, amount: parseFloat(amount), userId: uid }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === "error") return { error: json.message || "Data purchase failed." };

    return { success: true, message: \`✅ Data bundle purchased for \${phone} successfully.\` };
  },
});
`);

console.log("✅ All Eve agent files created successfully.");
console.log("Files written:");
console.log("  eve-agent/agent.ts");
console.log("  eve-agent/tools/check_balance.ts");
console.log("  eve-agent/tools/get_transaction_history.ts");
console.log("  eve-agent/tools/get_data_plans.ts");
console.log("  eve-agent/tools/buy_airtime.ts");
console.log("  eve-agent/tools/buy_data.ts");