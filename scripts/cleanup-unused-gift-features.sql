-- Cleanup unused direct gift sending features
-- Focus only on Gift Rooms system

-- 1. Check if gift_cards table exists and has data
SELECT 
  'Gift Cards Table Check' as check_type,
  COUNT(*) as total_gift_cards,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'claimed') as claimed,
  COUNT(*) FILTER (WHERE status = 'expired') as expired
FROM gift_cards;

-- 2. Check for any active/unclaimed gift cards
SELECT 
  'Active Gift Cards' as check_type,
  id,
  sender_id,
  recipient_email,
  amount,
  status,
  expires_at,
  created_at
FROM gift_cards 
WHERE status IN ('delivered', 'scheduled')
  AND expires_at > NOW()
ORDER BY created_at DESC;

-- 3. If no active gift cards, we can safely remove the table
-- ONLY RUN THIS IF YOU'RE SURE THERE ARE NO ACTIVE GIFT CARDS
/*
-- Backup data first (optional)
CREATE TABLE gift_cards_backup AS SELECT * FROM gift_cards;

-- Drop the table and related objects
DROP TABLE IF EXISTS gift_cards CASCADE;

-- Remove any related functions
DROP FUNCTION IF EXISTS send_gift_card(UUID, TEXT, TEXT, DECIMAL, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS claim_gift_card(UUID, UUID);
*/

-- 4. Clean up any gift card related notifications
UPDATE notifications 
SET type = 'info'
WHERE title LIKE '%gift card%' OR message LIKE '%gift card%';

-- 5. Check for any references to gift cards in other tables
SELECT 
  'Gift Card References' as check_type,
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE column_name LIKE '%gift_card%' 
   OR column_name LIKE '%gift%card%';

-- 6. Update any transaction descriptions that reference gift cards
UPDATE transactions 
SET description = REPLACE(description, 'Gift card', 'Gift room')
WHERE description LIKE '%Gift card%';

-- 7. Final verification - ensure Gift Rooms system is intact
SELECT 
  'Gift Rooms System Health' as check_type,
  COUNT(*) as total_rooms,
  COUNT(*) FILTER (WHERE status = 'active') as active_rooms,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_rooms,
  COUNT(*) FILTER (WHERE status = 'expired') as expired_rooms
FROM gift_rooms;

-- 8. Check reservations and claims are working
SELECT 
  'Reservations and Claims' as check_type,
  (SELECT COUNT(*) FROM reservations) as total_reservations,
  (SELECT COUNT(*) FROM reservations WHERE status = 'active') as active_reservations,
  (SELECT COUNT(*) FROM gift_claims) as total_claims,
  (SELECT SUM(amount) FROM gift_claims) as total_claimed_amount
;