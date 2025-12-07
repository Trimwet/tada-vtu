import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// Betting platforms supported
const BETTING_PLATFORMS: Record<string, string> = {
  bet9ja: 'Bet9ja',
  sportybet: 'SportyBet',
  betking: 'BetKing',
  '1xbet': '1xBet',
  nairabet: 'NairaBet',
  merrybet: 'MerryBet',
  bangbet: 'BangBet',
  msport: 'MSport',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, platform, customerId, amount, userId } = body;

    // Get platforms list
    if (action === 'get_platforms') {
      const platforms = Object.entries(BETTING_PLATFORMS).map(([id, name]) => ({ id, name }));
      return NextResponse.json({ status: true, data: platforms });
    }

    // Verify customer
    if (action === 'verify') {
      if (!platform || !customerId) {
        return NextResponse.json(
          { status: false, message: 'Platform and customer ID required' },
          { status: 400 }
        );
      }

      // Note: Betting verification may not be supported by Inlomax
      // This is a placeholder - in production, integrate with actual betting API
      return NextResponse.json({
        status: true,
        message: 'Customer ID accepted',
        data: { customerName: `${BETTING_PLATFORMS[platform]} User`, customerId, platform }
      });
    }

    // Fund betting account
    if (!platform || !customerId || !amount) {
      return NextResponse.json(
        { status: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }


    if (!BETTING_PLATFORMS[platform]) {
      return NextResponse.json(
        { status: false, message: 'Invalid betting platform' },
        { status: 400 }
      );
    }

    // User must be authenticated
    if (!userId) {
      return NextResponse.json(
        { status: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 100 || numAmount > 1000000) {
      return NextResponse.json(
        { status: false, message: 'Amount must be between ₦100 and ₦1,000,000' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { status: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const currentBalance = profile.balance || 0;
    if (currentBalance < numAmount) {
      return NextResponse.json(
        { status: false, message: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Generate reference
    const reference = `BET_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create pending transaction
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'betting',
        amount: -numAmount,
        status: 'pending',
        reference: reference,
        description: `${BETTING_PLATFORMS[platform]} Funding - ${customerId}`,
      })
      .select()
      .single();

    if (txnError) {
      console.error('Transaction creation error:', txnError);
      return NextResponse.json(
        { status: false, message: 'Failed to initiate transaction' },
        { status: 500 }
      );
    }

    try {
      // NOTE: Inlomax may not support betting wallet funding
      // This is currently a placeholder implementation
      // In production, you would integrate with the actual betting API
      
      console.log(`[BETTING] Funding ${BETTING_PLATFORMS[platform]} - ${customerId} with ₦${numAmount}`);
      
      // Simulate successful funding (replace with actual API call when available)
      const result = {
        status: 'success' as const,
        message: `${BETTING_PLATFORMS[platform]} account funded successfully`,
        data: {
          reference: reference,
          platform: BETTING_PLATFORMS[platform],
          customerId,
          amount: numAmount,
        }
      };

      if (result.status === 'success') {
        const newBalance = currentBalance - numAmount;
        
        // Deduct from wallet
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', userId);

        // Update transaction
        await supabase
          .from('transactions')
          .update({ status: 'success' })
          .eq('id', transaction.id);

        return NextResponse.json({
          status: true,
          message: result.message,
          data: {
            ...result.data,
            transactionId: transaction.id,
            newBalance,
          },
        });
      } else {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);

        return NextResponse.json({
          status: false,
          message: 'Betting funding failed. Please try again.',
        });
      }
    } catch (apiError) {
      console.error('[BETTING] API Error:', apiError);
      
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      return NextResponse.json(
        { status: false, message: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[BETTING] Unexpected error:', error);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
