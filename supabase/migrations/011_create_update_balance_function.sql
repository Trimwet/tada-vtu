-- Create update_user_balance function for atomic balance updates
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Get current balance with row lock
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Calculate new balance
  IF p_type = 'credit' THEN
    v_new_balance := v_current_balance + p_amount;
  ELSIF p_type = 'debit' THEN
    v_new_balance := v_current_balance - p_amount;
    
    -- Check for insufficient balance
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_current_balance, p_amount;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type: %. Must be credit or debit', p_type;
  END IF;

  -- Update balance
  UPDATE profiles
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = p_user_id;

  -- Record in wallet_transactions if table exists
  BEGIN
    INSERT INTO wallet_transactions (user_id, type, amount, description, reference, balance_before, balance_after)
    VALUES (p_user_id, p_type, p_amount, p_description, p_reference, v_current_balance, v_new_balance);
  EXCEPTION WHEN undefined_table THEN
    -- wallet_transactions table doesn't exist, skip
    NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_balance TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_balance TO service_role;
