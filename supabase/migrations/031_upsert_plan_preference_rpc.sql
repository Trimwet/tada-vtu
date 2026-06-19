-- 031: Upsert Plan Preference RPC
-- Called by POST /api/analytics/track-plan

CREATE OR REPLACE FUNCTION public.upsert_plan_preference(
  p_user_id UUID,
  p_service_type TEXT,
  p_network TEXT DEFAULT NULL,
  p_plan_id TEXT DEFAULT NULL,
  p_plan_name TEXT DEFAULT NULL,
  p_amount DECIMAL(12,2) DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_plan_preferences (user_id, service_type, network, plan_id, plan_name, amount, purchase_count, last_purchased_at)
  VALUES (p_user_id, p_service_type, p_network, p_plan_id, p_plan_name, p_amount, 1, NOW())
  ON CONFLICT (user_id, service_type, plan_id)
  DO UPDATE SET
    purchase_count = public.user_plan_preferences.purchase_count + 1,
    last_purchased_at = NOW(),
    plan_name = COALESCE(p_plan_name, public.user_plan_preferences.plan_name),
    amount = COALESCE(p_amount, public.user_plan_preferences.amount),
    network = COALESCE(p_network, public.user_plan_preferences.network);
END;
$$;
