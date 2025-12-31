-- Quick diagnosis for jonahmafuyai81@gmail.com gift room issues
-- Run this in your Supabase SQL editor

-- 1. Check if user exists and get basic info
SELECT 'USER INFO' as check_type, 
       id, email, full_name, wallet_balance, created_at
FROM profiles 
WHERE email = 'jonahmafuyai81@gmail.com';

-- 2. Check active gift rooms (last 24 hours)
SELECT 'ACTIVE GIFT ROOMS' as check_type,
       id, token, capacity, joined_count, status, amount, 
       created_at, expires_at,
       (expires_at < NOW()) as is_expired
FROM gift_rooms 
WHERE status IN ('active', 'full') 
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 3. Check user's reservations
SELECT 'USER RESERVATIONS' as check_type,
       r.id, r.room_id, r.status, r.user_id, r.device_fingerprint,
       r.created_at, r.expires_at, (r.expires_at < NOW()) as is_expired,
       gr.token, gr.capacity, gr.joined_count, gr.status as room_status
FROM reservations r
LEFT JOIN gift_rooms gr ON r.room_id = gr.id
WHERE r.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
ORDER BY r.created_at DESC;

-- 4. Check for capacity mismatches
SELECT 'CAPACITY ISSUES' as check_type,
       gr.id, gr.token, gr.capacity, gr.joined_count, gr.status,
       COUNT(r.id) as actual_reservations,
       COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END) as active_reservations,
       (gr.joined_count - COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END)) as discrepancy
FROM gift_rooms gr
LEFT JOIN reservations r ON gr.id = r.room_id
WHERE gr.status IN ('active', 'full')
  AND gr.created_at > NOW() - INTERVAL '24 hours'
GROUP BY gr.id, gr.token, gr.capacity, gr.joined_count, gr.status
HAVING gr.joined_count != COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END);

-- 5. Check recent activities for this user
SELECT 'USER ACTIVITIES' as check_type,
       gra.activity_type, gra.details, gra.created_at,
       gr.token, gr.capacity, gr.joined_count
FROM gift_room_activities gra
LEFT JOIN gift_rooms gr ON gra.room_id = gr.id
WHERE gra.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
   OR gra.details::text ILIKE '%jonahmafuyai81@gmail.com%'
ORDER BY gra.created_at DESC
LIMIT 10;