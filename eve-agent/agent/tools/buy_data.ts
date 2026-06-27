import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

const NEXT_APP_URL = process.env.NEXT_APP_URL || "http://localhost:3000";
const VALID_NETWORKS = ["MTN", "Airtel", "Glo", "9mobile"];

export default defineTool({
  description: "Buy a mobile data bundle for a Nigerian phone number after the user confirms.",
  inputSchema: z.object({
    network: z.string().describe("Network: MTN, Airtel, Glo, or 9mobile"),
    phone: z
      .string()
      .regex(/^0[789][01]\d{8}$/, "Phone must be an 11-digit Nigerian number e.g. 08012345678")
      .describe("11-digit Nigerian phone number"),
    planId: z.string().describe("Plan ID from get_data_plans"),
    amount: z.string().describe("Cost in Naira"),
    planName: z.string().describe("Plan name e.g. 1.5GB 30 Days"),
  }),
  needsApproval: always(),
  async execute(input, ctx) {
    const userId = ctx.session.auth.current?.principalId ||
      (process.env.NODE_ENV !== 'production' ? process.env.TEST_USER_ID : undefined);
    if (!userId) return { success: false, message: "Could not identify your account." };

    const network = VALID_NETWORKS.find((n) => n.toLowerCase() === input.network.toLowerCase());
    if (!network) return { success: false, message: `Invalid network. Choose: ${VALID_NETWORKS.join(", ")}` };

    const coreSecret = process.env.CORE_SECRET;
    if (!coreSecret) {
      return { success: false, message: "Agent is not configured correctly. Please contact support." };
    }

    try {
      const res = await fetch(`${NEXT_APP_URL}/api/data/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // x-core-secret tells the data route this is a trusted agent call;
          // the route skips the PIN check for verified agent sessions because
          // the user's identity was already authenticated by the Eve channel
          // (CORE_SECRET + x-tada-user-id header pair in channels/eve.ts).
          "x-core-secret": coreSecret,
        },
        body: JSON.stringify({
          network,
          phone: input.phone,
          planId: input.planId,
          amount: Number(input.amount),
          planName: input.planName,
          userId,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json() as { status: boolean; message: string; data?: { newBalance?: number } };
      return { success: data.status, message: data.message, newBalance: data.data?.newBalance };
    } catch {
      return { success: false, message: "Could not connect to payment service. Wallet was not charged." };
    }
  },
});
