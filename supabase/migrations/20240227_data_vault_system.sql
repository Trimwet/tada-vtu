-- Data Vault System Migration
-- Run this in Supabase SQL Editor

-- 1. Create data_vault table
CREATE TABLE IF NOT EXISTS public.data_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  network TEXT NOT NULL CHECK (network IN ('MTN', 'AIRTEL', 'GLO', '9MOBILE')),
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  recipient_phone TEXT NOT NULL,
  status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'delivered', 'expired', 'refunded')),
  transaction_id UUID REFERENCES public.transactions(id),
  delivery_reference TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create unique partial index to prevent duplicate ready items
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_vault_ready_unique 
  ON public.data_vault(user_id, recipient_phone, plan_id) 
  WHERE status = 'ready';

-- 3. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_data_vault_user_id ON public.data_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_data_vault_status ON public.data_vault(status);
CREATE INDEX IF NOT EXISTS idx_data_vault_expires_at ON public.data_vault(expires_at) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_data_vault_user_status ON public.data_vault(user_id, status);
CREATE INDEX IF NOT EXISTS idx_data_vault_created_at ON public.data_vault(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.data_vault ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view own vault items" ON public.data_vault;
DROP POLICY IF EXISTS "Users can insert own vault items" ON public.data_vault;
DROP POLICY IF EXISTS "Users can update own vault items" ON public.data_vault;

CREATE POLICY "Users can view own vault items" ON public.data_vault
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault items" ON public.data_vault
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items" ON public.data_vault
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Create RPC function to park data atomically
CREATE OR REPLACE FUNCTION public.park_data_vault(
  p_user_id UUID,
  p_network TEXT,
  p_plan_id TEXT,
  p_plan_name TEXT,
  p_amount DECIMAL,
  p_recipient_phone TEXT,
  p_transaction_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  vault_id UUID,
  new_balance DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Check if profile exists
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT false, 'User not found'::TEXT, NULL::UUID, 0::DECIMAL;
    RETURN;
  END IF;

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
    status, transaction_id, expires_at
  ) VALUES (
    p_user_id, p_network, p_plan_id, p_plan_name, p_amount, p_recipient_phone,
    'ready', p_transaction_id, NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_vault_id;

  -- Create wallet transaction record
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, description, reference, balance_before, balance_after
  ) VALUES (
    p_user_id, 'debit', p_amount,
    'Data Vault: ' || p_plan_name || ' for ' || p_recipient_phone,
    'VAULT_' || p_transaction_id,
    v_current_balance, v_new_balance
  );

  -- Return success
  RETURN QUERY SELECT true, 'Data parked successfully'::TEXT, v_vault_id, v_new_balance;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN QUERY SELECT false, SQLERRM::TEXT, NULL::UUID, v_current_balance;
END;
$$;

-- 7. Create RPC function to process expired vault items
CREATE OR REPLACE FUNCTION public.process_expired_vault_items()
RETURNS TABLE(
  processed_count INT,
  error_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed INT := 0;
  v_errors INT := 0;
  v_item RECORD;
  v_current_balance DECIMAL;
BEGIN
  -- Find all expired items that haven't been processed
  FOR v_item IN
    SELECT id, user_id, amount, plan_name, recipient_phone, network
    FROM public.data_vault
    WHERE status = 'ready'
      AND expires_at < NOW()
    ORDER BY expires_at ASC
    LIMIT 1000
  LOOP
    BEGIN
      -- Get current balance
      SELECT balance INTO v_current_balance
      FROM public.profiles
      WHERE id = v_item.user_id;

      -- Mark as expired
      UPDATE public.data_vault
      SET status = 'expired', 
          refunded_at = NOW(),
          updated_at = NOW()
      WHERE id = v_item.id;

      -- Refund balance
      UPDATE public.profiles
      SET balance = balance + v_item.amount, 
          updated_at = NOW()
      WHERE id = v_item.user_id;

      -- Record wallet transaction for refund
      INSERT INTO public.wallet_transactions (
        user_id, type, amount, description, reference, balance_before, balance_after
      ) VALUES (
        v_item.user_id, 
        'credit', 
        v_item.amount,
        'Data Vault Refund: ' || v_item.plan_name || ' for ' || v_item.recipient_phone,
        'VAULT_REFUND_' || v_item.id,
        v_current_balance, 
        v_current_balance + v_item.amount
      );

      -- Create notification
      INSERT INTO public.notifications (
        user_id, title, message, type
      ) VALUES (
        v_item.user_id,
        'Data Vault Expired',
        v_item.plan_name || ' for ' || v_item.recipient_phone || ' has expired and ₦' || v_item.amount || ' has been refunded to your wallet.',
        'info'
      );

      v_processed := v_processed + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Error processing vault item %: %', v_item.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_errors;
END;
$$;

-- 8. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_data_vault_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_data_vault_updated_at
  BEFORE UPDATE ON public.data_vault
  FOR EACH ROW
  EXECUTE FUNCTION public.update_data_vault_updated_at();

-- 9. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.data_vault TO authenticated;
GRANT EXECUTE ON FUNCTION public.park_data_vault TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_expired_vault_items TO service_role;

-- Migration complete
-- Test with: SELECT * FROM public.data_vault LIMIT 1;
