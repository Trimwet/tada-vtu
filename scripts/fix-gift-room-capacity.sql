-- Fix gift room capacity issues
-- Run this if you find discrepancies in the diagnosis

-- 1. Clean up expired reservations
DELETE FROM reservations 
WHERE status = 'active' 
  AND expires_at < NOW();

-- 2. Fix joined_count for all active rooms
UPDATE gift_rooms 
SET joined_count = (
    SELECT COUNT(*) 
    FROM reservations r 
    WHERE r.room_id = gift_rooms.id 
      AND r.status = 'active' 
      AND r.expires_at > NOW()
),
status = CASE 
    WHEN (
        SELECT COUNT(*) 
        FROM reservations r 
        WHERE r.room_id = gift_rooms.id 
          AND r.status = 'active' 
          AND r.expires_at > NOW()
    ) >= capacity THEN 'full'
    WHEN (
        SELECT COUNT(*) 
        FROM reservations r 
        WHERE r.room_id = gift_rooms.id 
          AND r.status = 'active' 
          AND r.expires_at > NOW()
    ) = 0 AND expires_at < NOW() THEN 'expired'
    ELSE 'active'
END,
updated_at = NOW()
WHERE status IN ('active', 'full');

-- 3. Link any orphaned reservations for jonahmafuyai81@gmail.com
UPDATE reservations 
SET user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com'),
    updated_at = NOW()
WHERE user_id IS NULL
  AND status = 'active'
  AND expires_at > NOW()
  AND contact_info::text ILIKE '%jonahmafuyai81@gmail.com%';

-- 4. Show results
SELECT 'FIXED ROOMS' as result_type,
       id, token, capacity, joined_count, status,
       (SELECT COUNT(*) FROM reservations r WHERE r.room_id = gift_rooms.id AND r.status = 'active' AND r.expires_at > NOW()) as actual_count
FROM gift_rooms 
WHERE status IN ('active', 'full')
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;