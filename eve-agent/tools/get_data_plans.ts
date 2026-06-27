import { tool } from "eve";
import { z } from "zod";

export default tool({
  description: "Fetch available data plans for a given Nigerian network.",
  parameters: z.object({
    network: z.string().describe("Network name: MTN, Airtel, Glo, or 9mobile"),
  }),
  execute: async ({ network }) => {
    const base = process.env.NEXT_APP_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/data-plans?network=${encodeURIComponent(network.toLowerCase())}`);
    if (!res.ok) return { error: `Could not fetch ${network} data plans.` };

    const json = await res.json();
    const plans = (json.plans || json.data || json || []).slice(0, 8);
    if (!plans.length) return { message: `No data plans found for ${network}.` };

    const lines = plans.map((p: Record<string, string | number>) =>
      `${p.name || p.plan} — ₦${p.price || p.amount} (${p.validity || p.duration})`
    );
    return { network, plans: lines };
  },
});
