-- ============================================================
-- Migration 043: Deposit Hold Period (3-day chargeback buffer)
-- ============================================================

-- 1. Create deposit_holds table
CREATE TABLE IF NOT EXISTS public.deposit_holds (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_credit        DECIMAL(12,2) NOT NULL,
  gross_amount         DECIMAL(12,2) NOT NULL,
  transaction_reference TEXT        NOT NULL UNIQUE,
  release_at           TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
  is_released          BOOLEAN      NOT NULL DEFAULT false,
  released_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_deposit_holds_user_id
  ON public.deposit_holds (user_id);

CREATE INDEX IF NOT EXISTS idx_deposit_holds_unreleased
  ON public.deposit_holds (user_id, is_released, release_at)
  WHERE is_released = false;

CREATE INDEX IF NOT EXISTS idx_deposit_holds_release_at
  ON public.deposit_holds (release_at)
  WHERE is_released = false;

-- 3. RLS
ALTER TABLE public.deposit_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own holds" ON public.deposit_holds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages holds" ON public.deposit_holds
  FOR ALL USING (auth.role() = 'service_role');

-- 4. get_withdrawable_balance(user_id)
CREATE OR REPLACE FUNCTION public.get_withdrawable_balance(p_user_id UUID)
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(12,2);
  v_locked  DECIMAL(12,2);
BEGIN
  SELECT COALESCE(balance, 0)
  INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT COALESCE(SUM(wallet_credit), 0)
  INTO v_locked
  FROM public.deposit_holds
  WHERE user_id = p_user_id
    AND is_released = false
    AND release_at > NOW();

  RETURN GREATEST(v_balance - v_locked, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_withdrawable_balance TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_withdrawable_balance FROM PUBLIC;

-- 5. release_expired_holds()
CREATE OR REPLACE FUNCTION public.release_expired_holds()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.deposit_holds
  SET is_released = true,
      released_at = NOW()
  WHERE is_released = false
    AND release_at <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_expired_holds TO service_role;
REVOKE EXECUTE ON FUNCTION public.release_expired_holds FROM PUBLIC;

COMMENT ON TABLE public.deposit_holds IS
  '3-day chargeback hold on deposited funds. A hold prevents the credited amount from being withdrawn until release_at passes.';
