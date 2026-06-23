-- 032: Add plan_type to user_plan_preferences
-- Why: Frequent Plans were only matched back to a live plan by (plan_id) or,
-- as a fallback, by (size + price). Many networks price identical sizes the
-- same across multiple data types (e.g. MTN 5GB can cost the same on SME,
-- Awoof, and Gifting), so the fallback could silently pick the wrong type
-- when the original plan_id was no longer available. Storing the type lets
-- us disambiguate correctly.

-- 1. Add the column
ALTER TABLE public.user_plan_preferences
  ADD COLUMN IF NOT EXISTS plan_type TEXT;

-- 2. Replace the upsert RPC to accept and persist plan_type.
--    Drop first since we're changing the parameter list (CREATE OR REPLACE
--    would otherwise create a second overloaded function instead of
--    replacing the original).
DROP FUNCTION IF EXISTS public.upsert_plan_preference(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL);

CREATE OR REPLACE FUNCTION public.upsert_plan_preference(
  p_user_id UUID,
  p_service_type TEXT,
  p_network TEXT DEFAULT NULL,
  p_plan_id TEXT DEFAULT NULL,
  p_plan_name TEXT DEFAULT NULL,
  p_amount DECIMAL(12,2) DEFAULT NULL,
  p_plan_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_plan_preferences (
    user_id, service_type, network, plan_id, plan_name, amount, plan_type, purchase_count, last_purchased_at
  )
  VALUES (
    p_user_id, p_service_type, p_network, p_plan_id, p_plan_name, p_amount, p_plan_type, 1, NOW()
  )
  ON CONFLICT (user_id, service_type, plan_id)
  DO UPDATE SET
    purchase_count = public.user_plan_preferences.purchase_count + 1,
    last_purchased_at = NOW(),
    plan_name = COALESCE(p_plan_name, public.user_plan_preferences.plan_name),
    amount = COALESCE(p_amount, public.user_plan_preferences.amount),
    network = COALESCE(p_network, public.user_plan_preferences.network),
    plan_type = COALESCE(p_plan_type, public.user_plan_preferences.plan_type);
END;
$$;

-- Note: existing rows will have plan_type = NULL until the user purchases
-- that same plan_id again (which backfills it via COALESCE above). Rows
-- created after this migration always get plan_type from the start.
