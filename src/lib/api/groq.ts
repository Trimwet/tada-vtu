// Groq AI API - FREE tier for generating smart tips
// Get your free API key at: https://console.groq.com/keys

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface TipContext {
  network: string;
  amount: number;
  type: 'airtime' | 'data' | 'cable' | 'electricity' | 'betting';
  planName?: string;
  userMonthlySpend?: number;
  purchaseCount?: number;
  timeOfDay?: string;
}

interface GeneratedTip {
  tip: string;
  savingsEstimate?: number;
  actionType?: 'timing' | 'bundle' | 'network' | 'promo' | 'general';
}

export async function generateSmartTip(context: TipContext): Promise<GeneratedTip> {
  const apiKey = process.env.GROQ_API_KEY;
  
  // If no API key, return a pre-written tip
  if (!apiKey) {
    return getFallbackTip(context);
  }

  const hour = new Date().getHours();
  const timeContext = hour >= 23 || hour < 6 ? 'night' : hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening';

  const prompt = buildPrompt(context, timeContext);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast and free
        messages: [
          {
            role: 'system',
            content: `You are a friendly Nigerian street-smart advisor who helps people save money on airtime, data, and bills. 
You speak in Nigerian Pidgin English mixed with regular English - casual, warm, like a helpful friend.
Keep tips SHORT (max 2 sentences), ACTIONABLE, and SPECIFIC.
Always mention potential savings in Naira when possible.
Never use offensive language. Be encouraging and positive.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return getFallbackTip(context);
    }

    const data = await response.json();
    const tipText = data.choices?.[0]?.message?.content?.trim();

    if (!tipText) {
      return getFallbackTip(context);
    }

    return {
      tip: tipText,
      actionType: detectActionType(tipText),
      savingsEstimate: extractSavings(tipText),
    };
  } catch (error) {
    console.error('Groq API error:', error);
    return getFallbackTip(context);
  }
}

function buildPrompt(context: TipContext, timeContext: string): string {
  const { network, amount, type, planName, userMonthlySpend, purchaseCount } = context;

  let prompt = `Give a money-saving tip for someone who just bought `;

  if (type === 'airtime') {
    prompt += `₦${amount} ${network} airtime`;
  } else if (type === 'data') {
    prompt += `${planName || `₦${amount}`} ${network} data`;
  } else if (type === 'cable') {
    prompt += `${network} cable TV subscription for ₦${amount}`;
  } else if (type === 'electricity') {
    prompt += `₦${amount} electricity for ${network}`;
  } else if (type === 'betting') {
    prompt += `₦${amount} betting credit`;
  }

  prompt += `. It's currently ${timeContext} time in Nigeria.`;

  if (userMonthlySpend && userMonthlySpend > 0) {
    prompt += ` They spend about ₦${userMonthlySpend.toLocaleString()} monthly on ${type}.`;
  }

  if (purchaseCount && purchaseCount > 3) {
    prompt += ` This is their ${purchaseCount}th purchase this month.`;
  }

  prompt += ` Give them ONE specific tip to save money. Be brief and friendly.`;

  return prompt;
}

function detectActionType(tip: string): GeneratedTip['actionType'] {
  const lowerTip = tip.toLowerCase();
  if (lowerTip.includes('night') || lowerTip.includes('11pm') || lowerTip.includes('midnight') || lowerTip.includes('time')) {
    return 'timing';
  }
  if (lowerTip.includes('bundle') || lowerTip.includes('plan') || lowerTip.includes('weekly') || lowerTip.includes('monthly')) {
    return 'bundle';
  }
  if (lowerTip.includes('switch') || lowerTip.includes('try') || lowerTip.includes('airtel') || lowerTip.includes('glo')) {
    return 'network';
  }
  if (lowerTip.includes('promo') || lowerTip.includes('bonus') || lowerTip.includes('code') || lowerTip.includes('dial')) {
    return 'promo';
  }
  return 'general';
}

function extractSavings(tip: string): number | undefined {
  const match = tip.match(/₦([\d,]+)/g);
  if (match && match.length > 0) {
    const amounts = match.map(m => parseInt(m.replace(/[₦,]/g, '')));
    return Math.max(...amounts);
  }
  return undefined;
}

// Fallback tips when API is unavailable
function getFallbackTip(context: TipContext): GeneratedTip {
  const { network, amount, type } = context;
  const hour = new Date().getHours();
  const isNight = hour >= 23 || hour < 6;

  const tips: Record<string, GeneratedTip[]> = {
    airtime: [
      { tip: `My guy! Next time buy ${network} airtime after 11pm - you fit get up to 2x bonus. Save ₦${amount} every week!`, actionType: 'timing', savingsEstimate: amount * 4 },
      { tip: `Sharp one! If you dey recharge often, try the weekly bundle instead - e go save you like ₦500 every month.`, actionType: 'bundle', savingsEstimate: 500 },
      { tip: `Boss, dial *131# to check if ${network} get any promo for you today. Free data dey hide there sometimes!`, actionType: 'promo' },
    ],
    data: [
      { tip: `Ehen! ${network} night data (11pm-6am) dey cheaper. If you fit download things at night, you go save plenty!`, actionType: 'timing', savingsEstimate: Math.round(amount * 0.3) },
      { tip: `My person! Instead of buying small small, try monthly plan - e dey save you up to 40% for real.`, actionType: 'bundle', savingsEstimate: Math.round(amount * 0.4) },
      { tip: `Quick tip: ${network} social bundles (WhatsApp, Instagram) dey cheaper if na only social media you wan use.`, actionType: 'bundle' },
    ],
    cable: [
      { tip: `Omo! Check if your decoder get the "pause subscription" option - save money when you travel or no dey house.`, actionType: 'general', savingsEstimate: amount },
      { tip: `Family plan dey save money o! If your neighbor wan subscribe too, una fit share decoder and split cost.`, actionType: 'bundle' },
    ],
    electricity: [
      { tip: `Sharp guy tip: Buy prepaid meter units during off-peak hours (night time) - some discos give small discount.`, actionType: 'timing' },
      { tip: `Check your appliances o! Old fridge and AC dey chop current like say na free. Energy-saving bulbs fit cut your bill by 30%.`, actionType: 'general', savingsEstimate: Math.round(amount * 0.3) },
    ],
    betting: [
      { tip: `Oga, set betting limit for yourself o! Small small win dey better pass one big loss. Play smart!`, actionType: 'general' },
      { tip: `Check the cashout option before match end - sometimes e better to take small profit than risk everything.`, actionType: 'general' },
    ],
  };

  const typeTips = tips[type] || tips.airtime;
  
  // If it's night time and we have a timing tip, prioritize it
  if (isNight) {
    const timingTip = typeTips.find(t => t.actionType === 'timing');
    if (timingTip) return timingTip;
  }

  // Random tip from the list
  return typeTips[Math.floor(Math.random() * typeTips.length)];
}

export { getFallbackTip };
