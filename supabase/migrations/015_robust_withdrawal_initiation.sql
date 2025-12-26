-- Migration: Robust Withdrawal Initiation
-- Description: Creates an atomic function to debit user balance and record a pending transaction

CREATE OR REPLACE FUNCTION initiate_withdrawal(
  p_user_id UUID,
  p_amount DECIMAL,
  p_bank_code TEXT,
  p_account_number TEXT,
  p_account_name TEXT,
  p_reference TEXT,
  p_description TEXT
) RETURNS JSON AS $$
DECLARE
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- 1. Lock user profile and check balance
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User profile not found');
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  -- 2. Calculate new balance
  v_new_balance := v_current_balance - p_amount;

  -- 3. Update balance
  UPDATE profiles
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  -- 4. Create transaction record (Status: pending)
  INSERT INTO transactions (
    user_id, 
    type, 
    amount, 
    status, 
    reference, 
    description, 
    metadata
  )
  VALUES (
    p_user_id, 
    'withdrawal', 
    -p_amount, 
    'pending', 
    p_reference, 
    p_description, 
    jsonb_build_object(
      'bankCode', p_bank_code,
      'accountNumber', p_account_number,
      'accountName', p_account_name
    )
  )
  RETURNING id INTO v_transaction_id;

  -- 5. Record in wallet_transactions for audit trail (consistent with update_user_balance)
  BEGIN
    INSERT INTO wallet_transactions (
      user_id, 
      type, 
      amount, 
      description, 
      reference, 
      balance_before, 
      balance_after
    )
    VALUES (
      p_user_id, 
      'debit', 
      p_amount, 
      p_description, 
      p_reference, 
      v_current_balance, 
      v_new_balance
    );
  EXCEPTION WHEN undefined_table THEN
    -- Fallback if table doesn't exist
    NULL;
  END;

  RETURN json_build_object(
    'success', true, 
    'transaction_id', v_transaction_id, 
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION initiate_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION initiate_withdrawal TO service_role;
