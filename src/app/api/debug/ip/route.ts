import { NextRequest, NextResponse } from 'next/server';

// This endpoint helps you find the outgoing IP of your Vercel serverless function
// Call this from production to see what IP Flutterwave sees
export async function GET(request: NextRequest) {
  try {
    // Get the IP that external services see
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    
    // Also get headers that might contain IP info
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    return NextResponse.json({
      outgoingIp: data.ip, // This is what Flutterwave sees
      forwardedFor,
      realIp,
      message: 'Add the outgoingIp to Flutterwave IP Whitelist'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get IP', details: String(error) },
      { status: 500 }
    );
  }
}
