import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRandomPrize } from "@/lib/loyalty";

interface ProfileLoyaltyData {
  loyalty_points?: number;
  loyalty_tier?: string;
  total_points_earned?: number;
  login_streak?: number;
  longest_streak?: number;
  spin_available?: boolean;
  last_spin_date?: string | null;
  last_login_date?: string | null;
  birthday?: string | null;
  balance?: number;
}

// GET - Get user's loyalty data
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use raw query to handle columns that may not exist
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Profile fetch error:", error);
      // Return defaults if error
      return NextResponse.json({
        loyalty_points: 0,
        loyalty_tier: "bronze",
        total_points_earned: 0,
        login_streak: 0,
        longest_streak: 0,
        spin_available: true,
        last_spin_date: null,
        birthday: null,
        transactions: [],
        achievements: [],
      });
    }

    const profileData = profile as ProfileLoyaltyData;

    // Get recent loyalty transactions (may not exist yet)
    let transactions: unknown[] = [];
    try {
      const { data: txData } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      transactions = txData || [];
    } catch {
      // Table may not exist yet
    }

    // Get user achievements (may not exist yet)
    let achievements: unknown[] = [];
    try {
      const { data: achData } = await supabase
        .from("user_achievements")
        .select("*, achievements(*)")
        .eq("user_id", user.id);
      achievements = achData || [];
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      loyalty_points: profileData.loyalty_points ?? 0,
      loyalty_tier: profileData.loyalty_tier ?? "bronze",
      total_points_earned: profileData.total_points_earned ?? 0,
      login_streak: profileData.login_streak ?? 0,
      longest_streak: profileData.longest_streak ?? 0,
      spin_available: profileData.spin_available ?? true,
      last_spin_date: profileData.last_spin_date ?? null,
      birthday: profileData.birthday ?? null,
      transactions,
      achievements,
    });
  } catch (error) {
    console.error("Loyalty GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Process actions (spin, redeem, daily login)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "daily_login": {
        const today = new Date().toISOString().split("T")[0];
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        const profileData = (profile as unknown) as ProfileLoyaltyData | null;
        const lastLogin = profileData?.last_login_date;
        const currentStreak = profileData?.login_streak || 0;
        const longestStreak = profileData?.longest_streak || 0;
        const currentPoints = profileData?.loyalty_points || 0;
        
        // Check if already logged in today
        if (lastLogin === today) {
          return NextResponse.json({ 
            success: true, 
            data: { streak: currentStreak, points_earned: 0, is_new_day: false } 
          });
        }

        // Calculate new streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        
        let newStreak = 1;
        if (lastLogin === yesterdayStr) {
          newStreak = currentStreak + 1;
        }

        // Calculate points (base 5 + streak bonus)
        const pointsEarned = 5 + Math.min(newStreak - 1, 7) * 2;
        const newLongestStreak = Math.max(longestStreak, newStreak);

        // Update profile - use raw update to handle columns that may not exist
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            login_streak: newStreak,
            longest_streak: newLongestStreak,
            last_login_date: today,
            loyalty_points: currentPoints + pointsEarned,
            spin_available: true,
          } as never)
          .eq("id", user.id);

        if (updateError) {
          console.error("Update error:", updateError);
          // If columns don't exist, just return success without updating
          return NextResponse.json({ 
            success: true, 
            data: { streak: 1, points_earned: 0, is_new_day: true } 
          });
        }

        return NextResponse.json({ 
          success: true, 
          data: { streak: newStreak, points_earned: pointsEarned, is_new_day: true } 
        });
      }

      case "spin": {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        const profileData = (profile as unknown) as ProfileLoyaltyData | null;
        const today = new Date().toISOString().split("T")[0];
        const canSpin = profileData?.spin_available !== false && profileData?.last_spin_date !== today;

        if (!canSpin) {
          return NextResponse.json({ error: "Spin not available today" }, { status: 400 });
        }

        // Get random prize
        const prize = getRandomPrize();

        // Calculate new points if prize is points
        let newPoints = profileData?.loyalty_points || 0;
        if (prize.type === "points" && prize.value > 0) {
          newPoints += prize.value;
        }

        // Update profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            spin_available: false,
            last_spin_date: today,
            loyalty_points: newPoints,
          } as never)
          .eq("id", user.id);

        if (updateError) {
          console.error("Spin update error:", updateError);
        }

        return NextResponse.json({ success: true, prize });
      }

      case "redeem": {
        const { pointsCost, rewardType, rewardValue } = body;

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        const profileData = (profile as unknown) as ProfileLoyaltyData | null;
        const currentPoints = profileData?.loyalty_points || 0;
        const currentBalance = profileData?.balance || 0;

        if (currentPoints < pointsCost) {
          return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
        }

        // Deduct points and add reward
        const updates: Record<string, unknown> = { 
          loyalty_points: currentPoints - pointsCost 
        };
        
        if (rewardType === "airtime" || rewardType === "data" || rewardType === "wallet") {
          updates.balance = currentBalance + rewardValue;
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update(updates as never)
          .eq("id", user.id);

        if (updateError) {
          console.error("Redeem update error:", updateError);
          return NextResponse.json({ error: "Failed to redeem reward" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Reward redeemed successfully" });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Loyalty POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
