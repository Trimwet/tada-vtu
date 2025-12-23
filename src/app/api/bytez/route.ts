import { NextRequest, NextResponse } from "next/server";

const BYTEZ_API_KEY = process.env.BYTEZ_API_KEY || "";
const BYTEZ_API_URL = "https://api.bytez.com/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen2.5-0.5B-Instruct";

export async function POST(request: NextRequest) {
  try {
    const { type, context } = await request.json();

    if (!BYTEZ_API_KEY) {
      return NextResponse.json({ output: getFallback(type, context) });
    }

    let prompt = "";
    let maxTokens = 50;

    switch (type) {
      case "greeting":
        prompt = `Generate a short, friendly ${context.timeOfDay} greeting for ${context.userName} who has ₦${context.balance?.toLocaleString() || 0} balance on a VTU app. Keep it under 15 words, warm. No quotes.`;
        break;
      case "tip":
        prompt = `Generate a helpful 1-sentence tip for a Nigerian VTU app user who just ${context.transactionType || "made a transaction"}. Be specific. Under 20 words.`;
        break;
      case "toast": {
        const toneMap: Record<string, string> = {
          success: "celebratory",
          error: "apologetic but helpful",
          info: "friendly",
          warning: "cautious"
        };
        prompt = `Generate a ${toneMap[context.toastType] || "friendly"} notification for: "${context.message}". Under 10 words, casual Nigerian tone.`;
        maxTokens = 30;
        break;
      }
      case "gift":
        prompt = `Write a heartfelt gift message for a ${context.occasion} gift${context.recipientName ? ` to ${context.recipientName}` : ""}. Under 25 words.`;
        maxTokens = 60;
        break;
      case "quote":
        prompt = "Generate a short motivational quote about saving money or financial growth. Under 15 words.";
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const response = await fetch(BYTEZ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BYTEZ_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bytez error:", errorText);
      return NextResponse.json({ output: getFallback(type, context) });
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || getFallback(type, context);

    return NextResponse.json({ output: output.trim() });
  } catch (error) {
    console.error("Bytez API error:", error);
    return NextResponse.json({ output: "Welcome back!" });
  }
}

function getFallback(type: string, context: Record<string, string>): string {
  switch (type) {
    case "greeting":
      return `Good ${context.timeOfDay || "day"}, ${context.userName || "there"}! Ready to top up?`;
    case "tip":
      return "Buy data bundles for better value than daily plans.";
    case "toast":
      return context.message || "Action completed!";
    case "gift":
      return "A special gift just for you!";
    case "quote":
      return "Small savings today, big rewards tomorrow.";
    default:
      return "Welcome!";
  }
}
