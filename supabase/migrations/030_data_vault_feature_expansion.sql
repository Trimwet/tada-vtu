-- ============================================================
-- 030: Data Vault Feature Expansion (Part 2)
-- Adds: occasion tags, personal messages, group pools,
--       public profiles, network reliability
-- ============================================================

-- ── 1. Table Extensions ──────────────────────────────────────────────────

-- Add occasion_tag to data_vault
ALTER TABLE public.data_vault
  ADD COLUMN IF NOT EXISTS occasion_tag text DEFAULT NULL;

-- Add gift_message and voice_note_url to vault_qr_codes
ALTER TABLE public.vault_qr_codes
  ADD COLUMN IF NOT EXISTS gift_message text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS voice_note_url text DEFAULT NULL;

-- Add dob to tada_contacts for occasion reminders
ALTER TABLE public.tada_contacts
  ADD COLUMN IF NOT EXISTS dob date DEFAULT NULL;

-- ── 2. New Tables ────────────────────────────────────────────────────────

-- Vault Pools (Social/Group Gifting)
CREATE TABLE IF NOT EXISTS public.vault_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid REFERENCES public.data_vault(id) ON DELETE SET NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  organizer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  contributors jsonb DEFAULT '[]', -- Array of {user_id, amount, name}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_pools_organizer ON public.vault_pools(organizer_id);
ALTER TABLE public.vault_pools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view open pools" ON public.vault_pools;
CREATE POLICY "Anyone can view open pools" ON public.vault_pools FOR SELECT USING (status = 'open');
DROP POLICY IF EXISTS "Organizers can manage own pools" ON public.vault_pools;
CREATE POLICY "Organizers can manage own pools" ON public.vault_pools FOR ALL USING (auth.uid() = organizer_id);

-- Public Profiles (Gifting Usernames)
CREATE TABLE IF NOT EXISTS public.tada_usernames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username text UNIQUE NOT NULL,
  photo_url text,
  bio text,
  preferred_networks text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tada_usernames_username ON public.tada_usernames(username);
ALTER TABLE public.tada_usernames ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view usernames" ON public.tada_usernames;
CREATE POLICY "Anyone can view usernames" ON public.tada_usernames FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own username" ON public.tada_usernames;
CREATE POLICY "Users can manage own username" ON public.tada_usernames FOR ALL USING (auth.uid() = user_id);

-- ── 3. Updated RPC ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.park_data_vault(
  p_user_id UUID,
  p_network TEXT,
  p_plan_id TEXT,
  p_plan_name TEXT,
  p_amount DECIMAL,
  p_recipient_phone TEXT,
  p_transaction_id UUID,
  p_deliver_at TIMESTAMPTZ DEFAULT NULL,
  p_freeze_until TIMESTAMPTZ DEFAULT NULL,
  p_occasion_tag TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  vault_id UUID,
  new_balance DECIMAL
) AS $$
DECLARE
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
  v_vault_id UUID;
  v_existing_count INT;
BEGIN
  -- Lock user profile for update
  SELECT balance INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check balance
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, NULL::UUID, v_current_balance;
    RETURN;
  END IF;

  -- Check for existing ready vault item (prevent duplicates)
  SELECT COUNT(*) INTO v_existing_count
  FROM public.data_vault
  WHERE user_id = p_user_id
    AND recipient_phone = p_recipient_phone
    AND plan_id = p_plan_id
    AND status = 'ready';

  IF v_existing_count > 0 THEN
    RETURN QUERY SELECT false, 'You already have this plan parked for this phone'::TEXT, NULL::UUID, v_current_balance;
    RETURN;
  END IF;

  -- Deduct balance
  v_new_balance := v_current_balance - p_amount;
  UPDATE public.profiles
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  -- Create vault entry
  INSERT INTO public.data_vault (
    user_id, network, plan_id, plan_name, amount, recipient_phone,
    status, transaction_id, expires_at, deliver_at, freeze_until, occasion_tag
  ) VALUES (
    p_user_id, p_network, p_plan_id, p_plan_name, p_amount, p_recipient_phone,
    'ready', p_transaction_id, NOW() + INTERVAL '7 days', p_deliver_at, p_freeze_until, p_occasion_tag
  )
  RETURNING id INTO v_vault_id;

  -- Return success
  RETURN QUERY SELECT true, 'Data parked successfully'::TEXT, v_vault_id, v_new_balance;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM::TEXT, NULL::UUID, v_current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Network Reliability View ──────────────────────────────────────────

CREATE OR REPLACE VIEW public.network_reliability_stats AS
SELECT 
  network,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE status = 'delivered') as successful_deliveries,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'delivered')::numeric / COUNT(*)::numeric) * 100, 
    1
  ) as success_rate,
  AVG(delivered_at - purchased_at) FILTER (WHERE status = 'delivered') as avg_delivery_time
FROM public.data_vault
WHERE status IN ('delivered', 'failed')
GROUP BY network;

GRANT SELECT ON public.network_reliability_stats TO authenticated;
