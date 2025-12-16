-- TADA VTU Engagement Features Migration
-- Run this in Supabase SQL Editor after the initial schema

-- 1. Add loyalty/engagement columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_date DATE,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS favorite_amounts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS spin_available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_spin_date DATE;

-- 2. Create loyalty_transactions table (points history)
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'expired')),
  source TEXT NOT NULL, -- 'transaction', 'login_streak', 'birthday', 'referral', 'spin', 'redemption'
  description TEXT,
  reference_id UUID, -- Link to transaction if applicable
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create scheduled_recharges table
CREATE TABLE IF NOT EXISTS public.scheduled_recharges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('airtime', 'data')),
  phone_number TEXT NOT NULL,
  network TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  data_plan_id TEXT, -- For data purchases
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  next_run_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_fund BOOLEAN DEFAULT false, -- Auto-deduct from wallet
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points_reward INTEGER DEFAULT 0,
  requirement_type TEXT NOT NULL, -- 'transactions', 'streak', 'referrals', 'spending'
  requirement_value INTEGER NOT NULL,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 6. Create spin_history table
CREATE TABLE IF NOT EXISTS public.spin_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  prize_type TEXT NOT NULL, -- 'points', 'discount', 'cashback', 'nothing'
  prize_value INTEGER NOT NULL,
  prize_code TEXT, -- Discount code if applicable
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create price_alerts table
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  network TEXT NOT NULL,
  data_size TEXT NOT NULL, -- '1GB', '2GB', etc.
  target_price DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create gift_transactions table
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id),
  gift_type TEXT NOT NULL CHECK (gift_type IN ('airtime', 'data', 'points')),
  amount DECIMAL(12,2) NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Insert default achievements
INSERT INTO public.achievements (code, name, description, icon, points_reward, requirement_type, requirement_value, tier) VALUES
('first_purchase', 'First Steps', 'Complete your first transaction', '🎉', 50, 'transactions', 1, 'bronze'),
('streak_7', 'Week Warrior', 'Login for 7 consecutive days', '🔥', 100, 'streak', 7, 'bronze'),
('streak_30', 'Monthly Master', 'Login for 30 consecutive days', '⭐', 500, 'streak', 30, 'silver'),
('transactions_10', 'Regular Customer', 'Complete 10 transactions', '🛒', 200, 'transactions', 10, 'bronze'),
('transactions_50', 'Power User', 'Complete 50 transactions', '💪', 500, 'transactions', 50, 'silver'),
('transactions_100', 'VIP Customer', 'Complete 100 transactions', '👑', 1000, 'transactions', 100, 'gold'),
('referrals_5', 'Social Butterfly', 'Refer 5 friends', '🦋', 300, 'referrals', 5, 'silver'),
('referrals_20', 'Influencer', 'Refer 20 friends', '🌟', 1000, 'referrals', 20, 'gold'),
('spending_10k', 'Big Spender', 'Spend ₦10,000 total', '💰', 200, 'spending', 10000, 'bronze'),
('spending_50k', 'High Roller', 'Spend ₦50,000 total', '💎', 500, 'spending', 50000, 'silver'),
('spending_100k', 'Platinum Spender', 'Spend ₦100,000 total', '🏆', 1000, 'spending', 100000, 'platinum')
ON CONFLICT (code) DO NOTHING;

-- 10. Create indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_recharges_user_id ON public.scheduled_recharges(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_recharges_next_run ON public.scheduled_recharges(next_run_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_history_user_id ON public.spin_history(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_sender ON public.gift_transactions(sender_id);

-- 11. Enable RLS on new tables
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_recharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
CREATE POLICY "Users can view own loyalty transactions" ON public.loyalty_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own scheduled recharges" ON public.scheduled_recharges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own scheduled recharges" ON public.scheduled_recharges
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own spin history" ON public.spin_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own price alerts" ON public.price_alerts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own gift transactions" ON public.gift_transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- 13. Function to calculate loyalty tier based on total points
CREATE OR REPLACE FUNCTION public.calculate_loyalty_tier(total_points INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF total_points >= 10000 THEN
    RETURN 'platinum';
  ELSIF total_points >= 5000 THEN
    RETURN 'gold';
  ELSIF total_points >= 1000 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 14. Function to award points
CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  p_user_id UUID,
  p_points INTEGER,
  p_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_new_total INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Insert loyalty transaction
  INSERT INTO public.loyalty_transactions (user_id, points, type, source, description, reference_id)
  VALUES (p_user_id, p_points, p_type, p_source, p_description, p_reference_id);
  
  -- Update user points
  IF p_type = 'earn' OR p_type = 'bonus' THEN
    UPDATE public.profiles
    SET 
      loyalty_points = loyalty_points + p_points,
      total_points_earned = total_points_earned + p_points,
      updated_at = NOW()
    WHERE id = p_user_id
    RETURNING total_points_earned INTO v_new_total;
  ELSIF p_type = 'redeem' THEN
    UPDATE public.profiles
    SET 
      loyalty_points = loyalty_points - p_points,
      updated_at = NOW()
    WHERE id = p_user_id;
    SELECT total_points_earned INTO v_new_total FROM public.profiles WHERE id = p_user_id;
  END IF;
  
  -- Update tier
  v_new_tier := public.calculate_loyalty_tier(v_new_total);
  UPDATE public.profiles SET loyalty_tier = v_new_tier WHERE id = p_user_id;
  
  RETURN v_new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Function to process daily login
CREATE OR REPLACE FUNCTION public.process_daily_login(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_last_login DATE;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_streak_bonus INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Get current user data
  SELECT last_login_date, login_streak INTO v_last_login, v_current_streak
  FROM public.profiles WHERE id = p_user_id;
  
  -- Check if already logged in today
  IF v_last_login = CURRENT_DATE THEN
    RETURN jsonb_build_object('already_logged', true, 'streak', v_current_streak);
  END IF;
  
  -- Calculate new streak
  IF v_last_login = CURRENT_DATE - 1 THEN
    v_new_streak := v_current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;
  
  -- Calculate streak bonus (every 7 days)
  IF v_new_streak % 7 = 0 THEN
    v_streak_bonus := v_new_streak * 10; -- 70 points for 7 days, 140 for 14, etc.
    PERFORM public.award_loyalty_points(p_user_id, v_streak_bonus, 'bonus', 'login_streak', 
      'Streak bonus for ' || v_new_streak || ' days');
  END IF;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    last_login_date = CURRENT_DATE,
    login_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    spin_available = CASE WHEN last_spin_date < CURRENT_DATE OR last_spin_date IS NULL THEN true ELSE spin_available END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'already_logged', false,
    'streak', v_new_streak,
    'streak_bonus', v_streak_bonus,
    'is_milestone', v_new_streak % 7 = 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
