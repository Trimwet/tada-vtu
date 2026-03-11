-- Migration: Add missing park_data_vault function
-- Run this to fix the Data Vault "park" feature

-- 1. Create the park_data_vault function
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
    status, transaction_id, expires_at
  ) VALUES (
    p_user_id, p_network, p_plan_id, p_plan_name, p_amount, p_recipient_phone,
    'ready', p_transaction_id, NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_vault_id;

  -- Return success
  RETURN QUERY SELECT true, 'Data parked successfully'::TEXT, v_vault_id, v_new_balance;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM::TEXT, NULL::UUID, v_current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.park_data_vault TO authenticated;

-- 3. Also grant to service_role if needed
GRANT EXECUTE ON FUNCTION public.park_data_vault TO service_role;
