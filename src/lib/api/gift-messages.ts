// Gift Message Generator using Groq AI
// Generates personalized messages for gift cards

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface GiftContext {
  senderName: string;
  recipientName?: string;
  occasion: string;
  amount: number;
  tone: 'casual' | 'formal' | 'funny' | 'romantic' | 'grateful';
  relationship?: 'friend' | 'family' | 'colleague' | 'partner' | 'other';
}

export interface GeneratedMessage {
  message: string;
  fallback?: boolean;
}

export async function generateGiftMessage(context: GiftContext): Promise<GeneratedMessage> {
  const apiKey = process.env.GROQ_API_KEY;
  
  // If no API key, return a fallback message
  if (!apiKey) {
    return { message: getFallbackMessage(context), fallback: true };
  }

  const prompt = buildGiftPrompt(context);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are a thoughtful Nigerian friend who writes beautiful, heartfelt gift messages. 
Your messages are warm, genuine, and culturally appropriate for Nigeria.
Keep messages SHORT (1-2 sentences max), PERSONAL, and MEANINGFUL.
Use natural Nigerian English - friendly but not too pidgin.
Match the tone requested: casual (friendly), formal (respectful), funny (light-hearted), romantic (loving), grateful (appreciative).
Never use offensive language. Always be positive and uplifting.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return { message: getFallbackMessage(context), fallback: true };
    }

    const data = await response.json();
    const messageText = data.choices?.[0]?.message?.content?.trim();

    if (!messageText) {
      return { message: getFallbackMessage(context), fallback: true };
    }

    // Clean up the message (remove quotes if AI added them)
    const cleanMessage = messageText.replace(/^["']|["']$/g, '').trim();

    return { message: cleanMessage, fallback: false };
  } catch (error) {
    console.error('Groq API error:', error);
    return { message: getFallbackMessage(context), fallback: true };
  }
}

function buildGiftPrompt(context: GiftContext): string {
  const { senderName, recipientName, occasion, amount, tone, relationship } = context;

  let prompt = `Write a ${tone} gift message for a ₦${amount.toLocaleString()} airtime gift card`;
  
  if (recipientName) {
    prompt += ` to ${recipientName}`;
  }
  
  prompt += ` for ${occasion}`;
  
  if (relationship) {
    prompt += ` (they are ${relationship === 'other' ? 'close' : relationship})`;
  }
  
  prompt += `. The sender is ${senderName}.`;

  // Add tone-specific guidance
  switch (tone) {
    case 'casual':
      prompt += ` Make it friendly and relaxed.`;
      break;
    case 'formal':
      prompt += ` Make it respectful and professional.`;
      break;
    case 'funny':
      prompt += ` Add some light humor but keep it appropriate.`;
      break;
    case 'romantic':
      prompt += ` Make it loving and sweet.`;
      break;
    case 'grateful':
      prompt += ` Express appreciation and gratitude.`;
      break;
  }

  prompt += ` Write ONLY the message, no quotes or extra text.`;

  return prompt;
}

// Fallback messages when AI is unavailable
function getFallbackMessage(context: GiftContext): string {
  const { occasion, tone, amount } = context;

  const messages: Record<string, Record<string, string[]>> = {
    birthday: {
      casual: [
        `Happy birthday! Hope this little gift brightens your day 🎉`,
        `Wishing you an amazing birthday! Enjoy this small token of love ❤️`,
        `Another year of awesomeness! Hope you have a fantastic celebration 🎂`
      ],
      formal: [
        `Wishing you a very happy birthday and many more years of success and happiness.`,
        `May this special day bring you joy and prosperity. Happy birthday!`,
        `Sending you warm birthday wishes and hoping your year ahead is filled with blessings.`
      ],
      funny: [
        `Happy birthday! You're not getting older, you're just getting more expensive to maintain 😄`,
        `Another year older, another year wiser... or so they say! Happy birthday! 🎈`,
        `Happy birthday! May your phone battery last longer than your age 📱`
      ],
      romantic: [
        `Happy birthday to the most special person in my life. You mean everything to me ❤️`,
        `On your special day, I want you to know how much you're loved. Happy birthday, my dear 💕`,
        `Every day with you is a gift, but today is extra special. Happy birthday, love 🌹`
      ],
      grateful: [
        `Thank you for being such an amazing person. Wishing you the happiest birthday!`,
        `Grateful to have you in my life. Hope your birthday is as wonderful as you are!`,
        `Your kindness means the world to me. Have the most beautiful birthday! 🙏`
      ]
    },
    love: {
      casual: [
        `Just because you're amazing and I wanted to show you some love ❤️`,
        `Thinking of you and wanted to send a little something your way 💕`,
        `You deserve all the good things in life. Here's a small token of my love 🌹`
      ],
      romantic: [
        `You're the sunshine in my life. This is just a small way to say I love you ❤️`,
        `Every moment with you is precious. Sending you love and this little gift 💕`,
        `My heart is full of love for you. Hope this brings a smile to your face 🌹`
      ]
    },
    thanks: {
      casual: [
        `Thank you so much! Your kindness means everything to me 🙏`,
        `Just wanted to say thanks for being so awesome! You're the best ❤️`,
        `Grateful for everything you do. This is my way of saying thank you! 😊`
      ],
      formal: [
        `I am deeply grateful for your kindness and support. Thank you very much.`,
        `Your generosity and thoughtfulness are truly appreciated. Thank you.`,
        `Please accept this small token of my sincere gratitude and appreciation.`
      ],
      grateful: [
        `Words cannot express how thankful I am. You've been such a blessing 🙏`,
        `Your support has meant the world to me. Thank you from the bottom of my heart ❤️`,
        `I'm so grateful for your kindness. This is just a small way to say thank you 😊`
      ]
    }
  };

  // Default messages for other occasions
  const defaultMessages = {
    casual: [
      `Hope this little gift brings a smile to your face! You deserve it ❤️`,
      `Thinking of you and wanted to send something special your way 😊`,
      `Just because you're amazing! Hope you enjoy this small gift 🎁`
    ],
    formal: [
      `Please accept this small gift as a token of my appreciation and best wishes.`,
      `Wishing you all the best and hoping this gift brings you joy.`,
      `Sending you warm wishes along with this small token of appreciation.`
    ],
    funny: [
      `Here's some airtime so you can call and thank me properly! 😄`,
      `Emergency airtime delivery! Use it wisely (or not, I'm not your mom) 📱`,
      `Roses are red, violets are blue, here's some airtime, just for you! 🌹`
    ],
    romantic: [
      `You're always on my mind and in my heart. This is just a small way to show my love ❤️`,
      `Distance means nothing when someone means everything. Sending you love 💕`,
      `Every day I'm grateful for you. Hope this little gift brightens your day 🌹`
    ],
    grateful: [
      `Thank you for being such a wonderful person. You deserve all the good things 🙏`,
      `Your kindness has touched my heart. This is my way of saying thank you ❤️`,
      `Grateful for your friendship and all that you do. You're truly special 😊`
    ]
  };

  const occasionMessages = messages[occasion] || defaultMessages;
  const toneMessages = occasionMessages[tone] || occasionMessages.casual;
  
  return toneMessages[Math.floor(Math.random() * toneMessages.length)];
}