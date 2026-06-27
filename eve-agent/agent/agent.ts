import { groq } from "@ai-sdk/groq";
import { defineAgent } from "eve";

export default defineAgent({
  model: groq("llama-3.3-70b-versatile"),
  // codeMode bypasses Groq's function-calling API entirely.
  // Instead of structured tool-call JSON (which Groq's streaming
  // implementation generates malformed), the model writes TypeScript
  // code that Eve interprets and executes. Avoids the
  // "Failed to call a function" streaming parse error.
  experimental: {
    codeMode: true,
  },
});
