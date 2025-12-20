import { NextRequest, NextResponse } from 'next/server';
import { generateGiftMessage, type GiftContext } from '@/lib/api/gift-messages';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { senderName, occasion, amount, tone } = body;
    
    if (!senderName || !occasion || !amount || !tone) {
      return NextResponse.json({
        status: false,
        message: 'Missing required fields: senderName, occasion, amount, tone'
      }, { status: 400 });
    }

    // Validate tone
    const validTones = ['casual', 'formal', 'funny', 'romantic', 'grateful'];
    if (!validTones.includes(tone)) {
      return NextResponse.json({
        status: false,
        message: 'Invalid tone. Must be one of: casual, formal, funny, romantic, grateful'
      }, { status: 400 });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount < 100 || amount > 50000) {
      return NextResponse.json({
        status: false,
        message: 'Amount must be between ₦100 and ₦50,000'
      }, { status: 400 });
    }

    const context: GiftContext = {
      senderName: String(senderName).trim(),
      recipientName: body.recipientName ? String(body.recipientName).trim() : undefined,
      occasion: String(occasion).trim(),
      amount: Number(amount),
      tone: tone as GiftContext['tone'],
      relationship: body.relationship || undefined
    };

    const result = await generateGiftMessage(context);

    return NextResponse.json({
      status: true,
      data: {
        message: result.message,
        fallback: result.fallback || false
      }
    });

  } catch (error) {
    console.error('Generate message error:', error);
    return NextResponse.json({
      status: false,
      message: 'Failed to generate message'
    }, { status: 500 });
  }
}