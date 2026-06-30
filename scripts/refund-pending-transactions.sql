-- Refund: 5 pending data transactions (Inlomax balance was empty)
-- Date: 2026-06-30
-- Total: ₦2,240
-- Users: dorcasjoshuadjad@gmail.com, gofupgershinen@gmail.com, lappyupdates@gmail.com

BEGIN;

-- 1. Mark pending transactions as failed
UPDATE transactions
SET 
  status = 'failed',
  description = description || ' [REFUNDED: Inlomax balance empty at time of purchase]',
  updated_at = NOW()
WHERE reference IN (
  'INL_DATA_1782691518542_94cgos7xx',
  'INL_DATA_1782654412135_83lvsvafa',
  'INL_DATA_1782654401544_au9rfv7fi',
  'INL_DATA_1782654380334_pbfojdjgw',
  'INL_DATA_1782647751198_rb9iuis54'
)
AND status = 'pending';

-- 2. Credit users back
UPDATE profiles
SET 
  balance = balance + refund.amount,
  updated_at = NOW()
FROM (
  SELECT user_id, ABS(amount) as amount
  FROM transactions
  WHERE reference IN (
    'INL_DATA_1782691518542_94cgos7xx',
    'INL_DATA_1782654412135_83lvsvafa',
    'INL_DATA_1782654401544_au9rfv7fi',
    'INL_DATA_1782654380334_pbfojdjgw',
    'INL_DATA_1782647751198_rb9iuis54'
  )
) refund
WHERE profiles.id = refund.user_id;

-- 3. Insert refund transaction records
INSERT INTO transactions (user_id, type, amount, status, description, reference, response_data, created_at, updated_at)
SELECT 
  user_id,
  'refund',
  ABS(amount),
  'success',
  'Refund: Inlomax balance was empty - ' || description,
  'REFUND_' || reference,
  jsonb_build_object('original_reference', reference, 'reason', 'inlomax_balance_empty', 'source', 'manual-admin'),
  NOW(),
  NOW()
FROM transactions
WHERE reference IN (
  'INL_DATA_1782691518542_94cgos7xx',
  'INL_DATA_1782654412135_83lvsvafa',
  'INL_DATA_1782654401544_au9rfv7fi',
  'INL_DATA_1782654380334_pbfojdjgw',
  'INL_DATA_1782647751198_rb9iuis54'
)
AND status = 'failed';

COMMIT;

-- Verify
SELECT p.email, p.balance, t.reference, t.type, t.amount, t.status
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.reference LIKE 'REFUND_INL_DATA_%'
ORDER BY t.created_at DESC;
