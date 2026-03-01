import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { points, serviceType, phoneNumber, network, planId, billerId, itemCode, userId } = body;

    // Rate limiting
    const identifier = userId || request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = checkRateLimit(`spend-points:${identifier}`, RATE_LIMITS.transaction);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { status: false, message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) } }
      );
    }

    // Validate required fields
    if (!points || points <= 0) {
      return NextResponse.json(
        { status: false, message: "Invalid points amount" },
        { status: 400 }
      );
    }

    if (!serviceType || !["airtime", "data"].includes(serviceType)) {
      return NextResponse.json(
        { status: false, message: "Invalid service type. Must be 'airtime' or 'data'" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { status: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get user's current points
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referral_points, referral_count')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { status: false, message: "User profile not found" },
        { status: 404 }
      );
    }

    // Check if user has enough points
    const currentPoints = profile.referral_points || 0;
    if (currentPoints < points) {
      return NextResponse.json(
        { status: false, message: `Insufficient points. You have ${currentPoints} points but need ${points}` },
        { status: 400 }
      );
    }

    // Deduct points
    const newPoints = currentPoints - points;
    await supabase
      .from('profiles')
      .update({ 
        referral_points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    // Create transaction record for the points deduction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'purchase',
      amount: -points,
      status: 'success',
      description: `Used ${points} referral points for ${serviceType}`,
      reference: `REF_SPEND_${Date.now()}_${userId.slice(0, 8)}`,
    } as any);

    // Return success - the actual purchase should be processed by the caller
    return NextResponse.json({
      status: true,
      message: `Successfully deducted ${points} points`,
      remainingPoints: newPoints,
      data: {
        pointsSpent: points,
        remainingPoints: newPoints,
        serviceType,
        purchaseParams: {
          phoneNumber,
          network,
          planId,
          billerId,
          itemCode
        }
      }
    });

  } catch (error) {
    console.error("Error spending referral points:", error);
    return NextResponse.json(
      { status: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { status: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get user's referral stats
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('referral_points, referral_count, referral_code')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { status: false, message: "Profile not found" },
        { status: 404 }
      );
    }

    // Get referral history
    const { data: referralTransactions } = await supabase
      .from('transactions')
      .select('id, amount, description, created_at')
      .eq('user_id', userId)
      .ilike('description', '%referral%')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      status: true,
      data: {
        points: profile.referral_points || 0,
        totalReferrals: profile.referral_count || 0,
        referralCode: profile.referral_code,
        history: referralTransactions || []
      }
    });

  } catch (error) {
    console.error("Error fetching referral stats:", error);
    return NextResponse.json(
      { status: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
