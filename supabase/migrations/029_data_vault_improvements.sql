-- ============================================================
-- 029: Data Vault Feature Improvements
-- Adds: scheduled delivery, smart retry, contacts, templates,
--       phone-locked QR, vault escrow fields
-- ============================================================

-- ── 1. Extend data_vault table ────────────────────────────────────────────

-- Scheduled delivery: user picks a future date/time to auto-deliver
ALTER TABLE public.data_vault
  ADD COLUMN IF NOT EXISTS deliver_at timestamptz DEFAULT NULL;

-- Smart retry: track retry attempts and next scheduled retry
ALTER TABLE public.data_vault
  ADD COLUMN IF NOT EXISTS retry_count int DEFAULT NULL;

ALTER TABLE public.data_vault
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz DEFAULT NULL;

-- Vault escrow: freeze delivery until a date, or set a self-refund deadline
ALTER TABLE public.data_vault
  ADD COLUMN IF NOT EXISTS freeze_until timestamptz DEFAULT NULL;

ALTER TABLE public.data_vault
  ADD COLUMN IF NOT EXISTS user_refund_deadline timestamptz DEFAULT NULL;

-- Indexes for cron queries
CREATE INDEX IF NOT EXISTS idx_data_vault_deliver_at
  ON public.data_vault(deliver_at)
  WHERE status = 'ready' AND deliver_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_data_vault_next_retry_at
  ON public.data_vault(next_retry_at)
  WHERE status = 'ready' AND next_retry_at IS NOT NULL;

-- ── 2. Extend vault_qr_codes table ───────────────────────────────────────

-- Phone-locked QR: only a specific phone can redeem
ALTER TABLE public.vault_qr_codes
  ADD COLUMN IF NOT EXISTS locked_to_phone text DEFAULT NULL;

-- ── 3. TADA Contacts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tada_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  network text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tada_contacts_user_id ON public.tada_contacts(user_id);

ALTER TABLE public.tada_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own contacts" ON public.tada_contacts;
CREATE POLICY "Users can manage own contacts" ON public.tada_contacts
  FOR ALL USING (auth.uid() = user_id);

-- ── 4. Vault Templates ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  network text NOT NULL,
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  amount numeric NOT NULL,
  recipient_phone text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_templates_user_id ON public.vault_templates(user_id);

ALTER TABLE public.vault_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own templates" ON public.vault_templates;
CREATE POLICY "Users can manage own templates" ON public.vault_templates
  FOR ALL USING (auth.uid() = user_id);

-- ── 5. Update process_expired_vault_items to respect user_refund_deadline ─

DROP FUNCTION IF EXISTS public.process_expired_vault_items();

CREATE FUNCTION public.process_expired_vault_items()
RETURNS TABLE(processed_count int, error_count int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed int := 0;
  v_errors int := 0;
  v_vault record;
BEGIN
  FOR v_vault IN
    SELECT * FROM public.data_vault
    WHERE status = 'ready'
      AND (
        -- Use user_refund_deadline if set, otherwise expires_at
        (user_refund_deadline IS NOT NULL AND user_refund_deadline <= now())
        OR
        (user_refund_deadline IS NULL AND expires_at <= now())
      )
  LOOP
    BEGIN
      UPDATE public.data_vault
        SET status = 'expired', updated_at = now()
        WHERE id = v_vault.id;

      -- Refund balance
      UPDATE public.profiles
        SET balance = balance + v_vault.amount
        WHERE id = v_vault.user_id;

      -- Update original transaction
      UPDATE public.transactions
        SET status = 'refunded'
        WHERE id = v_vault.transaction_id;

      -- Notify user
      INSERT INTO public.notifications(user_id, title, message, type)
        VALUES (
          v_vault.user_id,
          'Data Vault Expired & Refunded',
          '₦' || v_vault.amount || ' has been returned to your wallet (vault expired).',
          'info'
        );

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_errors;
END;
$$;

COMMENT ON TABLE public.tada_contacts IS 'User address book for frequent data recipients';
COMMENT ON TABLE public.vault_templates IS 'Saved park configurations for one-tap reuse';
