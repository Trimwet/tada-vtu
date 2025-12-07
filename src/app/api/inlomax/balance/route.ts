import { NextResponse } from 'next/server';
import { getWalletBalance } from '@/lib/api/inlomax';

export async function GET() {
  try {
    const balance = await getWalletBalance();
    return NextResponse.json(balance);
  } catch (error) {
    console.error('Error fetching Inlomax balance:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to fetch balance' 
      },
      { status: 500 }
    );
  }
}
