import { NextRequest, NextResponse } from 'next/server';
import { handleWhatsAppMessage } from '@/lib/stateful-vtu-wrapper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract message and phone number from WhatsApp webhook
    const message = body.message?.text || '';
    const phoneNumber = body.from || '';
    
    if (!message || !phoneNumber) {
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    // Process message with stateful VTU system
    const result = await handleWhatsAppMessage(message, phoneNumber);
    
    console.log(`📤 Reply: ${result.reply.substring(0, 100)}...`);

    // Return response for WhatsApp
    return NextResponse.json({
      reply: result.reply
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ 
      reply: '❌ An error occurred. Please try again later.' 
    }, { status: 500 });
  }
}

// Verify webhook (if needed)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  
  if (challenge) {
    return new Response(challenge);
  }
  
  return NextResponse.json({ status: 'WhatsApp webhook active' });
}