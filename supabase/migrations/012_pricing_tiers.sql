-- Add pricing tier tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pricing_tier TEXT DEFAULT 'bronze' 
  CHECK (pricing_tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_pricing_tier ON profiles(pricing_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_total_spent ON profiles(total_spent);

-- Function to update user's tier based on total spent
-- Thresholds: Bronze(0-9999), Silver(10k-49999), Gold(50k-199999), Platinum(200k+)
CREATE OR REPLACE FUNCTION update_user_pricing_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.pricing_tier := CASE
    WHEN NEW.total_spent >= 200000 THEN 'platinum'
    WHEN NEW.total_spent >= 50000 THEN 'gold'
    WHEN NEW.total_spent >= 10000 THEN 'silver'
    ELSE 'bronze'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update tier when total_spent changes
DROP TRIGGER IF EXISTS trigger_update_pricing_tier ON profiles;
CREATE TRIGGER trigger_update_pricing_tier
  BEFORE UPDATE OF total_spent ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_pricing_tier();

-- Function to increment total spent after a purchase
CREATE OR REPLACE FUNCTION increment_total_spent(
  p_user_id UUID,
  p_amount DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET total_spent = COALESCE(total_spent, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_total_spent TO service_role;

-- Calculate existing users' total spent from transactions
UPDATE profiles p
SET total_spent = COALESCE((
  SELECT SUM(ABS(amount))
  FROM transactions t
  WHERE t.user_id = p.id
    AND t.status = 'success'
    AND t.type IN ('airtime', 'data', 'cable', 'electricity', 'betting')
), 0);

-- Update all existing users' tiers based on new thresholds
UPDATE profiles
SET pricing_tier = CASE
  WHEN total_spent >= 200000 THEN 'platinum'
  WHEN total_spent >= 50000 THEN 'gold'
  WHEN total_spent >= 10000 THEN 'silver'
  ELSE 'bronze'
END;

-- Comments
COMMENT ON COLUMN profiles.total_spent IS 'Total amount spent on purchases (airtime, data, etc.)';
COMMENT ON COLUMN profiles.pricing_tier IS 'User pricing tier: bronze/silver/gold/platinum';
