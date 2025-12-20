import { NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface GiftMessageContext {
  senderName: string;
  recipientName: string;
  occasion: string;
  tone?: 'funny' | 'romantic' | 'formal' | 'casual' | 'poetic' | 'pidgin';
  relationship?: string;
}

export async function generateGiftMessage(context: GiftMessageContext): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return getFallbackMessage(context);
  }

  const prompt = buildPrompt(context);

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
            content: `You are a creative writer helping people write short, meaningful gift card messages.
            Keep messages under 280 characters.
            Be warm, specific, and authentic.
            If the tone is 'pidgin', use Nigerian Pidgin English.
            Do not include quotes around the message.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || getFallbackMessage(context);
  } catch (error) {
    console.error('AI Generation Error:', error);
    return getFallbackMessage(context);
  }
}

function buildPrompt(context: GiftMessageContext): string {
  const { senderName, recipientName, occasion, tone = 'casual', relationship } = context;
  
  let prompt = `Write a ${tone} gift card message from ${senderName} to ${recipientName} for ${occasion}.`;
  
  if (relationship) {
    prompt += ` They are ${relationship}.`;
  }
  
  return prompt;
}

function getFallbackMessage(context: GiftMessageContext): string {
  const { recipientName, occasion } = context;
  const messages = [
    `Happy ${occasion}, ${recipientName}! Hope this brings a smile to your face.`,
    `Thinking of you on this ${occasion}, ${recipientName}. Enjoy!`,
    `Here's a little something for you, ${recipientName}. Happy ${occasion}!`,
    `Wishing you the best ${occasion} ever, ${recipientName}!`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
