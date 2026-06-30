import { NextResponse } from 'next/server';
import { getWalletBalance } from '@/lib/api/inlomax';

let cache: { balance: number; expiresAt: number } | null = null;
const TTL_MS = 60_000; // 60 seconds

export async function GET() {
  try {
    if (cache && Date.now() < cache.expiresAt) {
      return NextResponse.json({ status: 'success', balance: cache.balance });
    }

    const result = await getWalletBalance();

    if (result.status === 'success' && result.data) {
      cache = { balance: result.data.funds, expiresAt: Date.now() + TTL_MS };
      return NextResponse.json({ status: 'success', balance: result.data.funds });
    }

    return NextResponse.json(
      { status: 'error', message: result.message || 'Failed to fetch balance' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Inlomax balance error:', error);
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
