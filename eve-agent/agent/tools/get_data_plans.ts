import { defineTool } from "eve/tools";
import { z } from "zod";

const NEXT_APP_URL = process.env.NEXT_APP_URL || "http://localhost:3000";

export default defineTool({
  description: "Fetch live data plans for a Nigerian network. Always call this before quoting any plan or price.",
  inputSchema: z.object({
    network: z.string().describe("Network name: MTN, Airtel, Glo, or 9mobile"),
  }),
  async execute(input) {
    try {
      const res = await fetch(
        `${NEXT_APP_URL}/api/data-plans?network=${encodeURIComponent(input.network.toUpperCase())}`,
        { cache: "no-store", signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json() as { success: boolean; plans?: unknown; byType?: unknown; error?: string };
      if (!data.success) return { status: false, message: data.error ?? "No plans available." };
      return { status: true, network: input.network, plans: data.plans, byType: data.byType };
    } catch {
      return { status: false, message: "Could not fetch data plans. Please try again." };
    }
  },
});
