-- Investigation Script for User: jonahmafuyai@gmail.com
-- Check profile, gift room activities, and potential wrongful refunds

-- 1. Get user profile information
SELECT 
    id,
    full_name,
    email,
    phone_number,
    balance,
    created_at,
    updated_at,
    is_active,
    kyc_level,
    total_spent,
    referral_code,
    referred_by
FROM profiles 
WHERE email = 'jonahmafuyai@gmail.com';

-- 2. Check all gift rooms created by this user
SELECT 
    gr.id,
    gr.token,
    gr.amount,
    gr.capacity,
    gr.joined_count,
    gr.claimed_count,
    gr.status,
    gr.created_at,
    gr.expires_at,
    gr.message
FROM gift_rooms gr
JOIN profiles p ON gr.creator_id = p.id
WHERE p.email = 'jonahmafuyai@gmail.com'
ORDER BY gr.created_at DESC;

-- 3. Check all gift rooms this user participated in (but didn't create)
SELECT 
    gr.id,
    gr.token,
    gr.amount,
    gr.capacity,
    gr.status,
    gr.created_at,
    creator.full_name as creator_name,
    creator.email as creator_email,
    grr.status as reservation_status,
    grr.created_at as joined_at,
    grr.claimed_at
FROM gift_rooms gr
JOIN profiles creator ON gr.creator_id = creator.id
JOIN gift_reservations grr ON gr.id = grr.gift_room_id
JOIN profiles participant ON grr.user_id = participant.id
WHERE participant.email = 'jonahmafuyai@gmail.com'
  AND creator.email != 'jonahmafuyai@gmail.com'  -- Exclude rooms they created
ORDER BY grr.created_at DESC;

-- 4. Check all gift claims by this user
SELECT 
    gc.id,
    gc.amount,
    gc.claimed_at,
    gr.token,
    gr.amount as room_amount,
    creator.full_name as room_creator,
    creator.email as creator_email,
    gc.referral_bonus_awarded
FROM gift_claims gc
JOIN gift_reservations grr ON gc.reservation_id = grr.id
JOIN gift_rooms gr ON grr.gift_room_id = gr.id
JOIN profiles creator ON gr.creator_id = creator.id
JOIN profiles claimer ON gc.user_id = claimer.id
WHERE claimer.email = 'jonahmafuyai@gmail.com'
ORDER BY gc.claimed_at DESC;

-- 5. Check all gift room activities involving this user
SELECT 
    gra.id,
    gra.activity_type,
    gra.details,
    gra.created_at,
    gr.token,
    gr.amount,
    creator.full_name as room_creator,
    creator.email as creator_email
FROM gift_room_activities gra
JOIN gift_rooms gr ON gra.gift_room_id = gr.id
JOIN profiles creator ON gr.creator_id = creator.id
JOIN profiles actor ON gra.user_id = actor.id
WHERE actor.email = 'jonahmafuyai@gmail.com'
ORDER BY gra.created_at DESC;

-- 6. Check wallet transactions related to gift rooms
SELECT 
    wt.id,
    wt.type,
    wt.amount,
    wt.description,
    wt.reference,
    wt.balance_before,
    wt.balance_after,
    wt.created_at
FROM wallet_transactions wt
JOIN profiles p ON wt.user_id = p.id
WHERE p.email = 'jonahmafuyai@gmail.com'
  AND (
    wt.description ILIKE '%gift%' OR 
    wt.reference ILIKE '%gift%' OR
    wt.description ILIKE '%refund%'
  )
ORDER BY wt.created_at DESC;

-- 7. Check regular transactions for gift-related activities
SELECT 
    t.id,
    t.type,
    t.amount,
    t.status,
    t.description,
    t.reference,
    t.created_at
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE p.email = 'jonahmafuyai@gmail.com'
  AND (
    t.description ILIKE '%gift%' OR 
    t.reference ILIKE '%gift%' OR
    t.type = 'gift'
  )
ORDER BY t.created_at DESC;

-- 8. Look for potential wrongful refunds - Check if user received refunds for rooms they didn't create
SELECT 
    'POTENTIAL WRONGFUL REFUND' as alert_type,
    wt.id as transaction_id,
    wt.amount,
    wt.description,
    wt.reference,
    wt.created_at,
    gr.token,
    gr.creator_id,
    creator.email as actual_creator_email,
    participant.email as refund_recipient_email
FROM wallet_transactions wt
JOIN profiles participant ON wt.user_id = participant.id
LEFT JOIN gift_rooms gr ON wt.reference ILIKE '%' || gr.id || '%'
LEFT JOIN profiles creator ON gr.creator_id = creator.id
WHERE participant.email = 'jonahmafuyai@gmail.com'
  AND wt.type = 'credit'
  AND wt.description ILIKE '%refund%'
  AND gr.creator_id != participant.id  -- User received refund but wasn't the creator
ORDER BY wt.created_at DESC;

-- 9. Check for any duplicate or suspicious refund patterns
SELECT 
    COUNT(*) as refund_count,
    SUM(wt.amount) as total_refunded,
    wt.reference,
    MIN(wt.created_at) as first_refund,
    MAX(wt.created_at) as last_refund
FROM wallet_transactions wt
JOIN profiles p ON wt.user_id = p.id
WHERE p.email = 'jonahmafuyai@gmail.com'
  AND wt.type = 'credit'
  AND wt.description ILIKE '%refund%'
GROUP BY wt.reference
HAVING COUNT(*) > 1  -- Multiple refunds for same reference
ORDER BY total_refunded DESC;

-- 10. Summary of user's gift room financial activity
SELECT 
    'SUMMARY' as report_type,
    COUNT(CASE WHEN gr.creator_id = p.id THEN 1 END) as rooms_created,
    SUM(CASE WHEN gr.creator_id = p.id THEN gr.amount * gr.capacity END) as total_funded,
    COUNT(CASE WHEN gc.user_id = p.id THEN 1 END) as gifts_claimed,
    SUM(CASE WHEN gc.user_id = p.id THEN gc.amount END) as total_claimed,
    SUM(CASE WHEN wt.description ILIKE '%refund%' AND wt.type = 'credit' THEN wt.amount END) as total_refunded
FROM profiles p
LEFT JOIN gift_rooms gr ON gr.creator_id = p.id
LEFT JOIN gift_claims gc ON gc.user_id = p.id
LEFT JOIN wallet_transactions wt ON wt.user_id = p.id
WHERE p.email = 'jonahmafuyai@gmail.com'
GROUP BY p.id, p.email;