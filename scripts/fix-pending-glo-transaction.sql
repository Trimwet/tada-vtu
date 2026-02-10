-- Fix the pending GLO transaction for halal daniel
-- Reference: INL_DATA_1770718234299_zwfnrurau

-- First, let's see the current state
SELECT 
  t.id,
  p.full_name,
  t.type,
  t.amount,
  t.status,
  t.description,
  t.reference,
  t.phone_number,
  t.network,
  t.created_at,
  t.external_reference
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.reference = 'INL_DATA_1770718234299_zwfnrurau';

-- If the description is wrong (showing reference instead of proper description),
-- update it to the correct format
UPDATE transactions
SET description = 'GLO 2.5GB - 08119878588'
WHERE reference = 'INL_DATA_1770718234299_zwfnrurau'
  AND (description IS NULL OR description = reference OR description LIKE 'INL_DATA_%');

-- If the transaction is stuck in pending status for more than 10 minutes,
-- mark it as failed and refund the user
DO $$
DECLARE
  v_transaction_id UUID;
  v_user_id UUID;
  v_amount NUMERIC;
  v_created_at TIMESTAMP;
BEGIN
  -- Get transaction details
  SELECT id, user_id, amount, created_at
  INTO v_transaction_id, v_user_id, v_amount, v_created_at
  FROM transactions
  WHERE reference = 'INL_DATA_1770718234299_zwfnrurau'
    AND status = 'pending';

  -- If transaction exists and is older than 10 minutes
  IF v_transaction_id IS NOT NULL AND v_created_at < NOW() - INTERVAL '10 minutes' THEN
    -- Mark as failed
    UPDATE transactions
    SET status = 'failed'
    WHERE id = v_transaction_id;

    -- Refund the user (add back the amount that was deducted)
    UPDATE profiles
    SET balance = balance + ABS(v_amount)
    WHERE id = v_user_id;

    RAISE NOTICE 'Transaction % marked as failed and ₦% refunded to user %', 
      v_transaction_id, ABS(v_amount), v_user_id;
  ELSE
    RAISE NOTICE 'Transaction not found or not old enough to mark as failed';
  END IF;
END $$;

-- Verify the fix
SELECT 
  t.id,
  p.full_name,
  p.balance,
  t.type,
  t.amount,
  t.status,
  t.description,
  t.reference,
  t.created_at
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.reference = 'INL_DATA_1770718234299_zwfnrurau';
