import { tool } from "eve";
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
    const res = await fetch(`${base}/api/v1/data/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-core-secret": process.env.CORE_SECRET || "" },
      body: JSON.stringify({ network, phone, planId, amount: parseFloat(amount), userId: uid }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === "error") return { error: json.message || "Data purchase failed." };

    return { success: true, message: `✅ Data bundle purchased for ${phone} successfully.` };
  },
});
