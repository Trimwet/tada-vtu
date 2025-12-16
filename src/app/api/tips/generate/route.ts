import { NextRequest, NextResponse } from 'next/server';
import { generateSmartTip } from '@/lib/api/groq';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, network, amount, type, planName } = body;

    if (!network || !amount || !type) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user's purchase history for personalized tips
    let userMonthlySpend = 0;
    let purchaseCount = 0;

    if (userId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get this month's transactions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('status', 'success')
        .gte('created_at', startOfMonth.toISOString());

      if (transactions) {
        purchaseCount = transactions.length;
        userMonthlySpend = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      }
    }

    // Generate the smart tip
    const tipResult = await generateSmartTip({
      network,
      amount: parseInt(amount),
      type,
      planName,
      userMonthlySpend,
      purchaseCount,
      timeOfDay: getTimeOfDay(),
    });

    // Save tip to database for analytics (optional)
    if (userId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      try {
        await supabase.from('echo_tips').insert({
          user_id: userId,
          tip_text: tipResult.tip,
          tip_type: tipResult.actionType || 'general',
          context: { network, amount, type, planName },
          savings_estimate: tipResult.savingsEstimate,
        });
      } catch {
        // Ignore errors - tip saving is optional
      }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        tip: tipResult.tip,
        actionType: tipResult.actionType,
        savingsEstimate: tipResult.savingsEstimate,
      },
    });
  } catch (error) {
    console.error('Tip generation error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to generate tip' },
      { status: 500 }
    );
  }
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 6) return 'night';
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}
