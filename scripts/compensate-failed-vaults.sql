-- Compensation script for data vault deliveries that failed due to QR redemption bug
-- These vaults were marked as "delivered" but never actually called Inlomax
-- Users were charged but didn't receive data

BEGIN;

-- 1. Reset affected vaults to "ready" status so users can retry
UPDATE data_vault
SET 
  status = 'ready',
  delivered_at = NULL,
  updated_at = NOW()
WHERE id IN (
  '9f955e97-ff73-4cdc-99d3-db0c37f8fbb9', -- jonahmafuyai81@gmail.com - 75MB AIRTEL
  'ec1afa45-aef5-442c-9028-b57b77cc97f0'  -- jasoncane186@gmail.com - 230MB MTN
)
AND status = 'delivered'
AND delivery_reference IS NULL;

-- 2. Mark the fake "delivered" transactions as failed
UPDATE transactions
SET 
  status = 'failed',
  description = description || ' [SYSTEM: Delivery failed due to bug, vault reset for retry]',
  updated_at = NOW()
WHERE reference IN (
  SELECT reference 
  FROM transactions 
  WHERE description LIKE '%delivered via QR code%'
    AND external_reference IS NULL
    AND status = 'success'
    AND created_at >= '2026-03-10'
);

-- 3. Create notifications for affected users
INSERT INTO notifications (user_id, title, message, type)
SELECT 
  user_id,
  'Data Vault Issue Resolved',
  'We discovered a technical issue that prevented your ' || plan_name || ' from being delivered. Your vault has been reset and is ready to deliver again. We apologize for the inconvenience!',
  'info'
FROM data_vault
WHERE id IN (
  '9f955e97-ff73-4cdc-99d3-db0c37f8fbb9',
  'ec1afa45-aef5-442c-9028-b57b77cc97f0'
);

-- 4. Log the compensation in audit trail
INSERT INTO audit_log (table_name, operation, record_id, details)
VALUES 
  ('data_vault', 'COMPENSATION', '9f955e97-ff73-4cdc-99d3-db0c37f8fbb9'::uuid, 
   '{"reason": "QR redemption bug - delivery never called Inlomax", "action": "Reset to ready", "user": "jonahmafuyai81@gmail.com", "amount": 74}'::jsonb),
  ('data_vault', 'COMPENSATION', 'ec1afa45-aef5-442c-9028-b57b77cc97f0'::uuid, 
   '{"reason": "QR redemption bug - delivery never called Inlomax", "action": "Reset to ready", "user": "jasoncane186@gmail.com", "amount": 196}'::jsonb);

COMMIT;

-- Verification query
SELECT 
  dv.id,
  p.email,
  dv.network,
  dv.plan_name,
  dv.amount,
  dv.recipient_phone,
  dv.status,
  dv.delivered_at,
  dv.delivery_reference
FROM data_vault dv
JOIN profiles p ON dv.user_id = p.id
WHERE dv.id IN (
  '9f955e97-ff73-4cdc-99d3-db0c37f8fbb9',
  'ec1afa45-aef5-442c-9028-b57b77cc97f0'
);
