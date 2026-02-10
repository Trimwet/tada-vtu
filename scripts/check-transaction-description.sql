-- Check the specific transaction with reference INL_DATA_1770718234299_zwfnrurau
SELECT 
  id,
  user_id,
  type,
  amount,
  status,
  description,
  reference,
  phone_number,
  network,
  created_at,
  external_reference
FROM transactions
WHERE reference = 'INL_DATA_1770718234299_zwfnrurau'
OR description LIKE '%INL_DATA_1770718234299_zwfnrurau%'
OR external_reference = 'INL_DATA_1770718234299_zwfnrurau';

-- Also check recent GLO data transactions for user 'halal daniel'
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
  t.created_at
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE p.full_name ILIKE '%halal%daniel%'
  AND t.type = 'data'
  AND t.network = 'GLO'
  AND t.created_at >= '2026-02-10'
ORDER BY t.created_at DESC
LIMIT 10;
