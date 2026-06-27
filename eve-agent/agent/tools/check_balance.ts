import { defineTool } from "eve/tools";
import { z } from "zod";

const NEXT_APP_URL =
  process.env.NEXT_APP_URL || "http://localhost:3000";

export default defineTool({
  description:
    "Check the current user's TADAPAY wallet balance. Call this whenever a user asks about their balance, funds, or how much money they have.",
  inputSchema: z.object({}),
  async execute(_, ctx) {
    const userId =
      ctx.session.auth.current?.principalId ||
      (process.env.NODE_ENV !== "production"
        ? process.env.TEST_USER_ID
        : undefined);

    if (!userId) {
      return {
        status: false,
        message: "Could not identify your account. Please contact support.",
      };
    }

    const coreSecret = process.env.CORE_SECRET;
    if (!coreSecret) {
      return {
        status: false,
        message: "Agent is not configured correctly. Please contact support.",
      };
    }

    try {
      const res = await fetch(
        `${NEXT_APP_URL}/api/wallet/balance?userId=${userId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-core-secret": coreSecret,
          },
          signal: AbortSignal.timeout(25000),
        }
      );

      const data = (await res.json()) as {
        status: boolean;
        message?: string;
        data?: { balance: number; currency: string };
      };

      if (!data.status || !data.data) {
        return {
          status: false,
          message: data.message ?? "Failed to read wallet balance.",
        };
      }

      const balance = data.data.balance;
      return {
        status: true,
        balance,
        formatted: `₦${balance.toLocaleString("en-NG", {
          minimumFractionDigits: 2,
        })}`,
      };
    } catch {
      return {
        status: false,
        message:
          "Could not reach the wallet service. Please try again later.",
      };
    }
  },
});
