import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Allows Go Core (and the Next.js WhatsApp webhook) to call Eve using
    // the shared CORE_SECRET as a Bearer token.  The x-tada-user-id header
    // carries the Supabase profile ID so Eve can scope actions to the right user.
    async (request) => {
      const authHeader = request.headers.get("Authorization");
      const secret = process.env.CORE_SECRET;
      if (secret && authHeader === `Bearer ${secret}`) {
        const userId = request.headers.get("x-tada-user-id");
        return {
          authenticator: "http-basic",
          principalId: userId || "vtu-core-system",
          principalType: "user",
          attributes: {},
        };
      }
      return null;
    },
  ],
});
