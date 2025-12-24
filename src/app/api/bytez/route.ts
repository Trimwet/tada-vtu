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
    let temperature = 0.9; // Increase temperature for more variety

    switch (type) {
      case "greeting": {
        const greetingTemplates = [
          `Generate a warm ${context.timeOfDay} greeting for ${context.userName} with ₦${context.balance?.toLocaleString() || 0} balance. Be encouraging about their VTU journey. Under 15 words.`,
          `Create a friendly ${context.timeOfDay} welcome for ${context.userName}. Mention their ₦${context.balance?.toLocaleString() || 0} balance positively. Keep it casual and under 15 words.`,
          `Write a cheerful ${context.timeOfDay} message for ${context.userName}. Reference their wallet balance of ₦${context.balance?.toLocaleString() || 0} optimistically. Under 15 words.`,
          `Generate an upbeat ${context.timeOfDay} greeting for ${context.userName}. Make them feel good about their ₦${context.balance?.toLocaleString() || 0} balance. Under 15 words.`,
          `Create a welcoming ${context.timeOfDay} message for ${context.userName}. Highlight their financial readiness with ₦${context.balance?.toLocaleString() || 0}. Under 15 words.`,
        ];
        const templateIndex = (context.variation || 0) % greetingTemplates.length;
        prompt = greetingTemplates[templateIndex];
        break;
      }
      case "tip": {
        const tipTemplates = [
          `Share a smart VTU tip for Nigerian users who just ${context.transactionType || "made a transaction"}. Focus on saving money. Under 20 words.`,
          `Give practical advice for Nigerian VTU users after ${context.transactionType || "a transaction"}. Focus on efficiency. Under 20 words.`,
          `Provide a helpful insight for Nigerian mobile users who ${context.transactionType || "completed a transaction"}. Focus on value. Under 20 words.`,
          `Share a pro tip for Nigerian telecom users after ${context.transactionType || "their transaction"}. Focus on smart usage. Under 20 words.`,
          `Give useful advice for Nigerian VTU customers who just ${context.transactionType || "made a purchase"}. Focus on optimization. Under 20 words.`,
        ];
        const templateIndex = (context.variation || 0) % tipTemplates.length;
        prompt = tipTemplates[templateIndex];
        break;
      }
      case "quote": {
        const quoteTemplates = [
          "Generate an inspiring quote about financial wisdom and smart spending. Under 15 words.",
          "Create a motivational saying about saving money and building wealth. Under 15 words.",
          "Write an uplifting quote about financial discipline and future success. Under 15 words.",
          "Generate a positive message about money management and prosperity. Under 15 words.",
          "Create an encouraging quote about financial growth and smart choices. Under 15 words.",
        ];
        const templateIndex = (context.variation || 0) % quoteTemplates.length;
        prompt = quoteTemplates[templateIndex];
        break;
      }
      case "toast": {
        const toneMap: Record<string, string> = {
          success: "celebratory",
          error: "apologetic but helpful",
          info: "friendly",
          warning: "cautious"
        };
        prompt = `Generate a ${toneMap[context.toastType] || "friendly"} notification for: "${context.message}". Under 10 words, casual Nigerian tone.`;
        maxTokens = 30;
        temperature = 0.7;
        break;
      }
      case "gift":
        prompt = `Write a heartfelt gift message for a ${context.occasion} gift${context.recipientName ? ` to ${context.recipientName}` : ""}. Under 25 words.`;
        maxTokens = 60;
        temperature = 0.8;
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
        temperature: temperature,
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

function getFallback(type: string, context: Record<string, any>): string {
  const variation = context.variation || 0;
  
  switch (type) {
    case "greeting": {
      const greetings = [
        `Good ${context.timeOfDay || "day"}, ${context.userName || "there"}! Ready to top up?`,
        `Hey ${context.userName || "there"}! Great to see you this ${context.timeOfDay || "day"}.`,
        `Welcome back, ${context.userName || "there"}! Let's get you connected.`,
        `Hi ${context.userName || "there"}! Your wallet is ready for action.`,
        `${context.timeOfDay ? context.timeOfDay.charAt(0).toUpperCase() + context.timeOfDay.slice(1) : "Good day"}, ${context.userName || "there"}! Time to recharge?`,
      ];
      return greetings[variation % greetings.length];
    }
    case "tip": {
      const tips = [
        "Buy data bundles for better value than daily plans.",
        "Set up auto-recharge to never run out of airtime.",
        "Check our deals page for special discounts.",
        "MTN SME data offers the best rates.",
        "Weekend data plans are often cheaper.",
      ];
      return tips[variation % tips.length];
    }
    case "quote": {
      const quotes = [
        "Small savings today, big rewards tomorrow.",
        "Every naira saved is a step toward your goals.",
        "Smart spending is the foundation of wealth.",
        "Consistency in saving builds financial freedom.",
        "Wise spending today, prosperity tomorrow.",
      ];
      return quotes[variation % quotes.length];
    }
    case "toast":
      return context.message || "Action completed!";
    case "gift":
      return "A special gift just for you!";
    default:
      return "Welcome!";
  }
}
