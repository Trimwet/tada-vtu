-- Fix gift room issues for jonahmafuyai81@gmail.com
-- Run this after investigating the issues

-- 1. Get user ID
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid FROM profiles WHERE email = 'jonahmafuyai81@gmail.com';
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'User jonahmafuyai81@gmail.com not found!';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user ID: %', user_uuid;
    
    -- 2. Link any orphaned reservations that might belong to this user
    UPDATE reservations 
    SET user_id = user_uuid,
        updated_at = NOW()
    WHERE user_id IS NULL
      AND status = 'active'
      AND expires_at > NOW()
      AND (
        contact_info::text ILIKE '%jonahmafuyai81@gmail.com%'
        OR device_fingerprint IN (
          SELECT DISTINCT device_fingerprint 
          FROM reservations 
          WHERE user_id = user_uuid
        )
      );
    
    GET DIAGNOSTICS user_uuid = ROW_COUNT;
    RAISE NOTICE 'Linked % orphaned reservations to user', user_uuid;
    
    -- 3. Clean up expired reservations
    DELETE FROM reservations 
    WHERE status = 'active' 
      AND expires_at < NOW();
    
    GET DIAGNOSTICS user_uuid = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % expired reservations', user_uuid;
    
    -- 4. Fix capacity inconsistencies
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
        ELSE 'active'
    END,
    updated_at = NOW()
    WHERE status IN ('active', 'full');
    
    GET DIAGNOSTICS user_uuid = ROW_COUNT;
    RAISE NOTICE 'Fixed capacity for % gift rooms', user_uuid;
    
END $$;

-- 5. Show final state for the user
SELECT 'FINAL USER STATE' as section;

-- User's created rooms
SELECT 
    'CREATED ROOMS' as type,
    gr.token,
    gr.capacity,
    gr.joined_count,
    gr.status,
    gr.amount,
    COUNT(r.id) as actual_reservations
FROM gift_rooms gr
LEFT JOIN reservations r ON gr.id = r.room_id AND r.status = 'active' AND r.expires_at > NOW()
WHERE gr.sender_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
GROUP BY gr.id, gr.token, gr.capacity, gr.joined_count, gr.status, gr.amount

UNION ALL

-- User's joined rooms  
SELECT 
    'JOINED ROOMS' as type,
    gr.token,
    gr.capacity,
    gr.joined_count,
    gr.status,
    gr.amount,
    1 as actual_reservations
FROM gift_rooms gr
INNER JOIN reservations r ON gr.id = r.room_id
WHERE r.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
  AND r.status = 'active'
  AND r.expires_at > NOW()
ORDER BY type, token;