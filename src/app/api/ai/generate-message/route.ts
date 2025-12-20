import { NextRequest, NextResponse } from 'next/server';
import { generateGiftMessage, GiftMessageContext } from '@/lib/api/ai-gift';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderName, recipientName, occasion, tone, relationship } = body;

    if (!occasion) {
      return NextResponse.json(
        { status: false, message: 'Occasion is required' },
        { status: 400 }
      );
    }

    const message = await generateGiftMessage({
      senderName: senderName || 'A Friend',
      recipientName: recipientName || 'Friend',
      occasion,
      tone,
      relationship,
    });

    return NextResponse.json({ status: true, message });
  } catch (error) {
    console.error('Generate message error:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to generate message' },
      { status: 500 }
    );
  }
}
