import { tool } from "eve";
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
    const res = await fetch(`${base}/api/v1/airtime/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-core-secret": process.env.CORE_SECRET || "" },
      body: JSON.stringify({ network, phone, amount: numAmount, userId: uid }),
    });
    // Note: this file uses the root tools/ path and agent.ts (root agent).
    // The active agent uses agent/tools/ instead. Keep in sync.

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === "error") return { error: json.message || "Airtime purchase failed." };

    return {
      success: true,
      message: `✅ ₦${numAmount} ${network} airtime sent to ${phone} successfully.`,
      reference: json.data?.reference,
    };
  },
});
