import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeSpendingPatterns, generateSmartRecommendation } from '@/lib/smart-optimizer';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// GET - Fetch user's recommendations
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get pending recommendations
    const { data: recommendations, error } = await supabase
      .from('smart_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gt('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching recommendations:', error);
      return NextResponse.json({ status: false, message: 'Failed to fetch recommendations' }, { status: 500 });
    }

    return NextResponse.json({
      status: true,
      data: recommendations || [],
    });
  } catch (error) {
    console.error('Recommendations GET error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}

// POST - Generate new recommendations for user
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ status: false, message: 'User ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get user's spending patterns (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: patterns, error: patternsError } = await supabase
      .from('user_spending_patterns')
      .select('*')
      .eq('user_id', userId)
      .gte('period_date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('period_date', { ascending: true });

    if (patternsError) {
      console.error('Error fetching patterns:', patternsError);
      return NextResponse.json({ status: false, message: 'Failed to analyze spending' }, { status: 500 });
    }

    // Get available network prices
    const { data: prices, error: pricesError } = await supabase
      .from('network_prices')
      .select('*')
      .eq('is_active', true);

    if (pricesError) {
      console.error('Error fetching prices:', pricesError);
      return NextResponse.json({ status: false, message: 'Failed to fetch prices' }, { status: 500 });
    }

    // Analyze patterns
    const analysis = await analyzeSpendingPatterns(patterns || []);

    // Generate recommendation
    const recommendation = await generateSmartRecommendation(userId, analysis, prices || []);

    // Save recommendation
    const { data: saved, error: saveError } = await supabase
      .from('smart_recommendations')
      .insert({
        user_id: userId,
        ...recommendation,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving recommendation:', saveError);
      return NextResponse.json({ status: false, message: 'Failed to save recommendation' }, { status: 500 });
    }

    return NextResponse.json({
      status: true,
      data: {
        recommendation: saved,
        analysis: {
          avgMonthlySpend: analysis.avgMonthlySpend,
          avgDataSpend: analysis.avgDataSpend,
          preferredNetwork: analysis.preferredNetwork,
          spendingTrend: analysis.spendingTrend,
        },
      },
    });
  } catch (error) {
    console.error('Recommendations POST error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}

// PATCH - Update recommendation status (accept/dismiss)
export async function PATCH(request: NextRequest) {
  try {
    const { recommendationId, action, userId } = await request.json();

    if (!recommendationId || !action || !userId) {
      return NextResponse.json({ status: false, message: 'Missing required fields' }, { status: 400 });
    }

    if (!['accept', 'dismiss'].includes(action)) {
      return NextResponse.json({ status: false, message: 'Invalid action' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const updateData = action === 'accept'
      ? { status: 'accepted', accepted_at: new Date().toISOString() }
      : { status: 'dismissed', dismissed_at: new Date().toISOString() };

    const { error } = await supabase
      .from('smart_recommendations')
      .update(updateData)
      .eq('id', recommendationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating recommendation:', error);
      return NextResponse.json({ status: false, message: 'Failed to update recommendation' }, { status: 500 });
    }

    return NextResponse.json({
      status: true,
      message: action === 'accept' ? 'Recommendation accepted!' : 'Recommendation dismissed',
    });
  } catch (error) {
    console.error('Recommendations PATCH error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}
