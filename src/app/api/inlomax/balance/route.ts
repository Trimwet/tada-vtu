import { NextResponse } from 'next/server';
import { getWalletBalance } from '@/lib/api/inlomax';

export async function GET() {
  try {
    const result = await getWalletBalance();
    
    if (result.status === 'success' && result.data) {
      return NextResponse.json({
        status: 'success',
        balance: result.data.funds,
      });
    }
    
    return NextResponse.json({
      status: 'error',
      message: result.message || 'Failed to fetch balance',
    }, { status: 400 });
  } catch (error) {
    console.error('Inlomax balance error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch balance',
    }, { status: 500 });
  }
}
