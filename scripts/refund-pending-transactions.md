# Refund: Pending Data Transactions (Inlomax Balance Empty)

**Date:** 2026-06-30  
**Total:** ₦2,240  
**Affected refs:** 5 transactions stuck as `pending`

| Reference | Network | Amount |
|-----------|---------|--------|
| INL_DATA_1782691518542_94cgos7xx | GLO 1GB → 09056722057 | ₦320 |
| INL_DATA_1782654412135_83lvsvafa | MTN 500MB → 07061413859 | ₦240 |
| INL_DATA_1782654401544_au9rfv7fi | MTN 1GB → 07061413859 | ₦280 |
| INL_DATA_1782654380334_pbfojdjgw | MTN 1GB → 09134090763 | ₦280 |
| INL_DATA_1782647751198_rb9iuis54 | MTN 5GB → 09133226008 | ₦1,120 |

---

## Step 1 — Verify transactions exist

```sql
SELECT 
  t.reference,
  p.email,
  p.id as user_id,
  t.type,
  t.amount,
  t.status,
  t.created_at
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.reference IN (
  'INL_DATA_1782691518542_94cgos7xx',
  'INL_DATA_1782654412135_83lvsvafa',
  'INL_DATA_1782654401544_au9rfv7fi',
  'INL_DATA_1782654380334_pbfojdjgw',
  'INL_DATA_1782647751198_rb9iuis54'
)
ORDER BY t.created_at DESC;
```

## Step 2 — Check user balances before refund

```sql
SELECT p.id, p.email, p.balance
FROM profiles p
WHERE p.id IN (
  SELECT DISTINCT user_id FROM transactions
  WHERE reference IN (
    'INL_DATA_1782691518542_94cgos7xx',
    'INL_DATA_1782654412135_83lvsvafa',
    'INL_DATA_1782654401544_au9rfv7fi',
    'INL_DATA_1782654380334_pbfojdjgw',
    'INL_DATA_1782647751198_rb9iuis54'
  )
);
```

## Step 3 — Execute refunds

```sql
BEGIN;

-- Mark pending transactions as failed
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

-- Credit users back
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

-- Insert refund transaction records
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
```

## Step 4 — Verify refunds landed

```sql
SELECT p.email, p.balance,
       t.reference, t.type, t.amount, t.status
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.reference LIKE 'REFUND_INL_DATA_%'
ORDER BY t.created_at DESC;
```
