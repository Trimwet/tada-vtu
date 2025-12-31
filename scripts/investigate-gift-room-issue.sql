-- Comprehensive investigation for gift room issues with jonahmafuyai81@gmail.com
-- This script will check all aspects of gift rooms, reservations, and user visibility

-- 1. Find the user profile
SELECT 'USER PROFILE' as section;
SELECT 
    id,
    email,
    full_name,
    created_at,
    wallet_balance
FROM profiles 
WHERE email = 'jonahmafuyai81@gmail.com';

-- Store user ID for later queries
\set user_id (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')

-- 2. Check all active gift rooms
SELECT 'ACTIVE GIFT ROOMS' as section;
SELECT 
    id,
    sender_id,
    type,
    capacity,
    amount,
    message,
    token,
    status,
    joined_count,
    claimed_count,
    created_at,
    expires_at,
    (expires_at < NOW()) as is_expired
FROM gift_rooms 
WHERE status IN ('active', 'full')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check reservations for this user
SELECT 'USER RESERVATIONS' as section;
SELECT 
    r.id,
    r.room_id,
    r.device_fingerprint,
    r.temp_token,
    r.status,
    r.contact_info,
    r.user_id,
    r.created_at,
    r.expires_at,
    (r.expires_at < NOW()) as is_expired,
    gr.token as room_token,
    gr.amount as room_amount,
    gr.status as room_status
FROM reservations r
LEFT JOIN gift_rooms gr ON r.room_id = gr.id
WHERE r.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
ORDER BY r.created_at DESC;

-- 4. Check reservations by device fingerprint patterns (in case user_id linking failed)
SELECT 'POTENTIAL USER RESERVATIONS BY DEVICE' as section;
SELECT 
    r.id,
    r.room_id,
    r.device_fingerprint,
    r.temp_token,
    r.status,
    r.contact_info,
    r.user_id,
    r.created_at,
    r.expires_at,
    (r.expires_at < NOW()) as is_expired,
    gr.token as room_token,
    gr.amount as room_amount,
    gr.status as room_status,
    p.email as linked_user_email
FROM reservations r
LEFT JOIN gift_rooms gr ON r.room_id = gr.id
LEFT JOIN profiles p ON r.user_id = p.id
WHERE r.contact_info::text ILIKE '%jonahmafuyai81@gmail.com%'
   OR r.device_fingerprint LIKE '%jonah%'
   OR r.user_id IS NULL
ORDER BY r.created_at DESC
LIMIT 20;

-- 5. Check all reservations for the most recent active gift rooms
SELECT 'ALL RESERVATIONS FOR RECENT ACTIVE ROOMS' as section;
SELECT 
    gr.id as room_id,
    gr.token,
    gr.capacity,
    gr.joined_count,
    gr.status as room_status,
    COUNT(r.id) as actual_reservations,
    COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END) as active_reservations,
    STRING_AGG(DISTINCT p.email, ', ') as user_emails,
    STRING_AGG(DISTINCT r.device_fingerprint, ', ') as device_fingerprints
FROM gift_rooms gr
LEFT JOIN reservations r ON gr.id = r.room_id
LEFT JOIN profiles p ON r.user_id = p.id
WHERE gr.status IN ('active', 'full')
  AND gr.created_at > NOW() - INTERVAL '24 hours'
GROUP BY gr.id, gr.token, gr.capacity, gr.joined_count, gr.status
ORDER BY gr.created_at DESC;

-- 6. Check gift room activities for recent rooms
SELECT 'RECENT GIFT ROOM ACTIVITIES' as section;
SELECT 
    gra.id,
    gra.room_id,
    gr.token,
    gra.activity_type,
    gra.details,
    gra.ip_address,
    gra.user_agent,
    gra.created_at,
    p.email as user_email
FROM gift_room_activities gra
LEFT JOIN gift_rooms gr ON gra.room_id = gr.id
LEFT JOIN profiles p ON gra.user_id = p.id
WHERE gr.created_at > NOW() - INTERVAL '24 hours'
   OR gra.details::text ILIKE '%jonahmafuyai81@gmail.com%'
   OR p.email = 'jonahmafuyai81@gmail.com'
ORDER BY gra.created_at DESC
LIMIT 50;

-- 7. Check for capacity inconsistencies
SELECT 'CAPACITY INCONSISTENCIES' as section;
SELECT 
    gr.id,
    gr.token,
    gr.capacity,
    gr.joined_count,
    gr.status,
    COUNT(r.id) as total_reservations,
    COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END) as active_reservations,
    (gr.joined_count - COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END)) as discrepancy
FROM gift_rooms gr
LEFT JOIN reservations r ON gr.id = r.room_id
WHERE gr.status IN ('active', 'full')
GROUP BY gr.id, gr.token, gr.capacity, gr.joined_count, gr.status
HAVING gr.joined_count != COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END)
ORDER BY ABS(gr.joined_count - COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END)) DESC;

-- 8. Check what the user should see in their gift room dashboard
SELECT 'USER GIFT ROOM DASHBOARD DATA' as section;
-- Rooms created by user
SELECT 
    'CREATED' as type,
    gr.id,
    gr.token,
    gr.type,
    gr.capacity,
    gr.amount,
    gr.status,
    gr.joined_count,
    gr.claimed_count,
    gr.created_at,
    gr.expires_at
FROM gift_rooms gr
WHERE gr.sender_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
ORDER BY gr.created_at DESC

UNION ALL

-- Rooms joined by user
SELECT 
    'JOINED' as type,
    gr.id,
    gr.token,
    gr.type,
    gr.capacity,
    gr.amount,
    gr.status,
    gr.joined_count,
    gr.claimed_count,
    gr.created_at,
    gr.expires_at
FROM gift_rooms gr
INNER JOIN reservations r ON gr.id = r.room_id
WHERE r.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
ORDER BY gr.created_at DESC;

-- 9. Check for any error logs or failed join attempts
SELECT 'FAILED JOIN ATTEMPTS' as section;
SELECT 
    gra.id,
    gra.room_id,
    gr.token,
    gra.activity_type,
    gra.details,
    gra.created_at,
    p.email
FROM gift_room_activities gra
LEFT JOIN gift_rooms gr ON gra.room_id = gr.id
LEFT JOIN profiles p ON gra.user_id = p.id
WHERE gra.activity_type = 'join_failed'
   OR (gra.details::text ILIKE '%jonahmafuyai81@gmail.com%' AND gra.activity_type IN ('joined', 'join_failed'))
ORDER BY gra.created_at DESC
LIMIT 20;

-- 10. Summary of current state
SELECT 'SUMMARY' as section;
SELECT 
    'Total active gift rooms' as metric,
    COUNT(*) as value
FROM gift_rooms 
WHERE status = 'active'

UNION ALL

SELECT 
    'User reservations (active)' as metric,
    COUNT(*) as value
FROM reservations r
WHERE r.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
  AND r.status = 'active'
  AND r.expires_at > NOW()

UNION ALL

SELECT 
    'User reservations (total)' as metric,
    COUNT(*) as value
FROM reservations r
WHERE r.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')

UNION ALL

SELECT 
    'Rooms with capacity issues' as metric,
    COUNT(*) as value
FROM (
    SELECT gr.id
    FROM gift_rooms gr
    LEFT JOIN reservations r ON gr.id = r.room_id
    WHERE gr.status IN ('active', 'full')
    GROUP BY gr.id, gr.joined_count
    HAVING gr.joined_count != COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END)
) as inconsistent_rooms;