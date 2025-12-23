// Bytez AI API Integration
// Used for typewriter text, smart toasts, and AI-generated content

const BYTEZ_API_KEY = process.env.BYTEZ_API_KEY || "";
const BYTEZ_API_URL = "https://api.bytez.com/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen2.5-0.5B-Instruct";

export async function generateWithBytez(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  if (!BYTEZ_API_KEY) {
    console.warn("BYTEZ_API_KEY not configured");
    return "";
  }
  
  try {
    const response = await fetch(BYTEZ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BYTEZ_API_KEY}`,
      },
      body: JSON.stringify({
        model: options?.model || DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: options?.maxTokens || 100,
        temperature: options?.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Bytez error:", text);
      return "";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Bytez API error:", error);
    return "";
  }
}

// Dashboard typewriter messages
export async function generateDashboardGreeting(userName: string, timeOfDay: string, balance: number): Promise<string> {
  const prompt = `Generate a short, friendly ${timeOfDay} greeting for ${userName} who has ₦${balance.toLocaleString()} balance on a VTU (airtime/data) app. Keep it under 15 words, warm and encouraging. No quotes.`;
  
  const result = await generateWithBytez(prompt);
  return result || getDefaultGreeting(userName, timeOfDay);
}

export async function generateSmartTip(context: {
  lastTransaction?: string;
  network?: string;
  amount?: number;
  type?: string;
}): Promise<string> {
  const prompt = `Generate a helpful 1-sentence tip for a Nigerian VTU app user who just ${context.type === "airtime" ? "bought airtime" : context.type === "data" ? "bought data" : "made a transaction"}${context.network ? ` on ${context.network}` : ""}. Be specific and useful. Under 20 words.`;
  
  const result = await generateWithBytez(prompt);
  return result || getDefaultTip();
}

export async function generateToastMessage(
  type: "success" | "error" | "info" | "warning",
  context: string
): Promise<string> {
  const toneMap = {
    success: "celebratory and encouraging",
    error: "apologetic but helpful",
    info: "friendly and informative",
    warning: "cautious but reassuring"
  };
  
  const prompt = `Generate a ${toneMap[type]} toast notification message for: "${context}". Keep it under 10 words, casual Nigerian-friendly tone. No emojis.`;
  
  const result = await generateWithBytez(prompt, { maxTokens: 30 });
  return result || context;
}

export async function generateGiftMessage(
  occasion: string,
  recipientName?: string,
  amount?: number
): Promise<string> {
  const prompt = `Write a short, heartfelt gift message for a ${occasion} gift${recipientName ? ` to ${recipientName}` : ""}${amount ? ` worth ₦${amount.toLocaleString()}` : ""}. Keep it under 25 words, warm and personal.`;
  
  const result = await generateWithBytez(prompt, { maxTokens: 50, temperature: 0.8 });
  return result || getDefaultGiftMessage(occasion);
}

// Motivational quotes for dashboard
export async function generateMotivationalQuote(): Promise<string> {
  const prompt = "Generate a short motivational quote about saving money, financial growth, or smart spending. Under 15 words. No attribution needed.";
  
  const result = await generateWithBytez(prompt, { temperature: 0.9 });
  return result || getDefaultQuote();
}

// Fallback messages
function getDefaultGreeting(name: string, timeOfDay: string): string {
  const greetings = [
    `Good ${timeOfDay}, ${name}! Ready to top up?`,
    `Hey ${name}! Great to see you this ${timeOfDay}.`,
    `Welcome back, ${name}! What can we help with today?`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function getDefaultTip(): string {
  const tips = [
    "Buy data bundles for better value than daily plans.",
    "Set up auto-recharge to never run out of airtime.",
    "Check our deals page for special discounts.",
    "Refer friends to earn bonus credits.",
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

function getDefaultGiftMessage(occasion: string): string {
  const messages: Record<string, string> = {
    birthday: "Wishing you an amazing birthday filled with joy!",
    anniversary: "Celebrating your special day with love!",
    thanks: "Thank you for being amazing!",
    love: "Sending you all my love!",
    default: "A special gift just for you!",
  };
  return messages[occasion] || messages.default;
}

function getDefaultQuote(): string {
  const quotes = [
    "Small savings today, big rewards tomorrow.",
    "Every naira saved is a step toward your goals.",
    "Smart spending is the foundation of wealth.",
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}
