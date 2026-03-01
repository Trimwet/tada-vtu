-- Add referral_points and referral_count columns to profiles table
-- This enables the new referral points system

-- Add referral_points column (INTEGER, default 0)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 0;

-- Add referral_count column (INTEGER, default 0)  
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_referral_points ON profiles(referral_points);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_count ON profiles(referral_count);

-- Update existing rows to ensure default values
UPDATE profiles SET referral_points = 0 WHERE referral_points IS NULL;
UPDATE profiles SET referral_count = 0 WHERE referral_count IS NULL;

-- Enable RLS on new columns
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own referral points
DROP POLICY IF EXISTS "Users can view own referral points" ON profiles;
CREATE POLICY "Users can view own referral points" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own referral points
DROP POLICY IF EXISTS "Users can update own referral points" ON profiles;
CREATE POLICY "Users can update own referral points" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RPC function to add referral points
CREATE OR REPLACE FUNCTION add_referral_points(
  p_user_id UUID,
  p_points INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET referral_points = referral_points + p_points,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Create RPC function to increment referral count
CREATE OR REPLACE FUNCTION increment_referral_count(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET referral_count = referral_count + 1,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Create RPC function to spend referral points (for purchasing airtime/data)
CREATE OR REPLACE FUNCTION spend_referral_points(
  p_user_id UUID,
  p_points INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_points INTEGER;
BEGIN
  -- Get current points
  SELECT referral_points INTO current_points
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check if user has enough points
  IF current_points < p_points THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct points
  UPDATE profiles
  SET referral_points = referral_points - p_points,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$;

COMMENT ON COLUMN profiles.referral_points IS 'Points earned from referring users';
COMMENT ON COLUMN profiles.referral_count IS 'Number of successful referrals';
