-- Debug what the user dashboard APIs should return for jonahmafuyai81@gmail.com

-- 1. Simulate the /api/gift-rooms/my-rooms endpoint
SELECT 'MY-ROOMS API SIMULATION' as section;

-- Get user ID
\set user_id (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')

-- Rooms created by user (what my-rooms API should return)
SELECT 
    gr.id,
    gr.sender_id,
    gr.type,
    gr.capacity,
    gr.amount,
    gr.total_amount,
    gr.message,
    gr.token,
    gr.status,
    gr.joined_count,
    gr.claimed_count,
    gr.metadata,
    gr.created_at,
    gr.expires_at,
    gr.updated_at,
    -- Calculate actual stats
    COUNT(r.id) as actual_total_reservations,
    COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END) as actual_active_reservations,
    COUNT(CASE WHEN r.status = 'claimed' THEN 1 END) as actual_claimed_reservations
FROM gift_rooms gr
LEFT JOIN reservations r ON gr.id = r.room_id
WHERE gr.sender_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
GROUP BY gr.id, gr.sender_id, gr.type, gr.capacity, gr.amount, gr.total_amount, 
         gr.message, gr.token, gr.status, gr.joined_count, gr.claimed_count, 
         gr.metadata, gr.created_at, gr.expires_at, gr.updated_at
ORDER BY gr.created_at DESC;

-- 2. Simulate the /api/gift-rooms/history endpoint  
SELECT 'HISTORY API SIMULATION' as section;

-- Rooms where user has reservations (what history API should return)
SELECT 
    gr.id,
    gr.sender_id,
    gr.type,
    gr.capacity,
    gr.amount,
    gr.message,
    gr.token,
    gr.status,
    gr.joined_count,
    gr.claimed_count,
    gr.created_at,
    gr.expires_at,
    r.id as reservation_id,
    r.status as reservation_status,
    r.created_at as joined_at,
    r.expires_at as reservation_expires_at,
    gc.id as claim_id,
    gc.claimed_at,
    gc.amount as claimed_amount,
    sender.full_name as sender_name,
    sender.email as sender_email
FROM gift_rooms gr
INNER JOIN reservations r ON gr.id = r.room_id
LEFT JOIN gift_claims gc ON r.id = gc.reservation_id
LEFT JOIN profiles sender ON gr.sender_id = sender.id
WHERE r.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
ORDER BY r.created_at DESC;

-- 3. Check RLS policies - what user can actually see
SELECT 'RLS POLICY CHECK' as section;

-- Test gift_rooms RLS policy
SELECT 
    'gift_rooms_visible' as table_name,
    COUNT(*) as visible_count
FROM gift_rooms gr
WHERE gr.sender_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
   OR EXISTS (
       SELECT 1 FROM reservations r 
       WHERE r.room_id = gr.id 
       AND r.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
   );

-- Test reservations RLS policy  
SELECT 
    'reservations_visible' as table_name,
    COUNT(*) as visible_count
FROM reservations r
WHERE r.user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
   OR r.user_id IS NULL;

-- 4. Check for orphaned reservations (reservations without user_id that should be linked)
SELECT 'ORPHANED RESERVATIONS' as section;
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
    gr.token as room_token
FROM reservations r
LEFT JOIN gift_rooms gr ON r.room_id = gr.id
WHERE r.user_id IS NULL
  AND r.status = 'active'
  AND r.expires_at > NOW()
  AND (
    r.contact_info::text ILIKE '%jonahmafuyai81@gmail.com%'
    OR r.device_fingerprint IN (
      SELECT DISTINCT device_fingerprint 
      FROM reservations 
      WHERE user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com')
    )
  )
ORDER BY r.created_at DESC;

-- 5. Check recent gift room tokens that might be the problematic one
SELECT 'RECENT GIFT ROOM TOKENS' as section;
SELECT 
    gr.token,
    gr.capacity,
    gr.joined_count,
    gr.status,
    gr.created_at,
    gr.expires_at,
    COUNT(r.id) as total_reservations,
    COUNT(CASE WHEN r.status = 'active' AND r.expires_at > NOW() THEN 1 END) as active_reservations,
    STRING_AGG(DISTINCT COALESCE(p.email, 'anonymous'), ', ') as reservation_emails
FROM gift_rooms gr
LEFT JOIN reservations r ON gr.id = r.room_id
LEFT JOIN profiles p ON r.user_id = p.id
WHERE gr.created_at > NOW() - INTERVAL '2 hours'
GROUP BY gr.id, gr.token, gr.capacity, gr.joined_count, gr.status, gr.created_at, gr.expires_at
ORDER BY gr.created_at DESC;