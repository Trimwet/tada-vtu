-- Check for Wrongful Gift Refunds
-- This script identifies cases where users received refunds for gift rooms they didn't create

-- 1. Find all gift refund transactions
WITH gift_refunds AS (
    SELECT 
        wt.id as transaction_id,
        wt.user_id,
        wt.amount,
        wt.description,
        wt.reference,
        wt.created_at,
        p.email,
        p.full_name,
        -- Extract gift room ID from reference if possible
        CASE 
            WHEN wt.reference ~ 'gift_refund_([a-f0-9-]+)' THEN 
                (regexp_matches(wt.reference, 'gift_refund_([a-f0-9-]+)'))[1]::uuid
            WHEN wt.reference ~ 'GIFT_CREATE_([a-f0-9-]+)' THEN 
                (regexp_matches(wt.reference, 'GIFT_CREATE_([a-f0-9-]+)'))[1]::uuid
            ELSE NULL
        END as extracted_room_id
    FROM wallet_transactions wt
    JOIN profiles p ON wt.user_id = p.id
    WHERE wt.type = 'credit'
      AND (
        wt.description ILIKE '%gift%refund%' OR 
        wt.description ILIKE '%refund%gift%' OR
        wt.reference ILIKE '%gift_refund%' OR
        wt.reference ILIKE '%manual_refund%'
      )
),

-- 2. Match refunds with actual gift room creators
wrongful_refunds AS (
    SELECT 
        gr.id as refund_transaction_id,
        gr.user_id as refund_recipient_id,
        gr.email as refund_recipient_email,
        gr.full_name as refund_recipient_name,
        gr.amount as refund_amount,
        gr.description as refund_description,
        gr.reference as refund_reference,
        gr.created_at as refund_date,
        gr.extracted_room_id,
        groom.id as actual_room_id,
        groom.creator_id as actual_creator_id,
        creator.email as actual_creator_email,
        creator.full_name as actual_creator_name,
        groom.amount as room_amount,
        groom.capacity as room_capacity,
        groom.token as room_token,
        groom.status as room_status,
        CASE 
            WHEN gr.user_id = groom.creator_id THEN 'LEGITIMATE_REFUND'
            WHEN gr.user_id != groom.creator_id THEN 'WRONGFUL_REFUND'
            WHEN groom.id IS NULL THEN 'ROOM_NOT_FOUND'
            ELSE 'UNKNOWN'
        END as refund_status
    FROM gift_refunds gr
    LEFT JOIN gift_rooms groom ON gr.extracted_room_id = groom.id
    LEFT JOIN profiles creator ON groom.creator_id = creator.id
)

-- 3. Show all potential wrongful refunds
SELECT 
    refund_status,
    refund_transaction_id,
    refund_recipient_email,
    refund_recipient_name,
    refund_amount,
    refund_description,
    refund_reference,
    refund_date,
    room_token,
    actual_creator_email,
    actual_creator_name,
    room_amount,
    room_capacity
FROM wrongful_refunds
WHERE refund_status IN ('WRONGFUL_REFUND', 'ROOM_NOT_FOUND')
ORDER BY refund_date DESC;

-- 4. Specifically check jonahmafuyai@gmail.com
SELECT 
    'JONAHMAFUYAI INVESTIGATION' as investigation_type,
    wr.*
FROM wrongful_refunds wr
WHERE wr.refund_recipient_email = 'jonahmafuyai@gmail.com'
ORDER BY wr.refund_date DESC;

-- 5. Summary of wrongful refunds by user
SELECT 
    refund_recipient_email,
    refund_recipient_name,
    COUNT(*) as wrongful_refund_count,
    SUM(refund_amount) as total_wrongful_amount,
    MIN(refund_date) as first_wrongful_refund,
    MAX(refund_date) as last_wrongful_refund
FROM wrongful_refunds
WHERE refund_status = 'WRONGFUL_REFUND'
GROUP BY refund_recipient_email, refund_recipient_name
ORDER BY total_wrongful_amount DESC;

-- 6. Check if jonahmafuyai participated in rooms but got creator refunds
WITH user_participations AS (
    SELECT DISTINCT
        grr.user_id,
        grr.gift_room_id,
        gr.creator_id,
        gr.token,
        gr.amount,
        p.email as participant_email,
        creator.email as creator_email
    FROM gift_reservations grr
    JOIN gift_rooms gr ON grr.gift_room_id = gr.id
    JOIN profiles p ON grr.user_id = p.id
    JOIN profiles creator ON gr.creator_id = creator.id
    WHERE p.email = 'jonahmafuyai@gmail.com'
      AND grr.user_id != gr.creator_id  -- User participated but didn't create
)

SELECT 
    'PARTICIPATION_VS_REFUND_CHECK' as check_type,
    up.participant_email,
    up.token as room_token,
    up.creator_email as actual_creator,
    up.amount as room_amount,
    wt.amount as refund_received,
    wt.description as refund_description,
    wt.created_at as refund_date
FROM user_participations up
JOIN wallet_transactions wt ON wt.user_id = up.user_id
WHERE wt.type = 'credit'
  AND wt.description ILIKE '%refund%'
  AND wt.created_at >= '2024-01-01'  -- Recent refunds
ORDER BY wt.created_at DESC;

-- 7. Create a corrective action plan
SELECT 
    'CORRECTIVE_ACTION_NEEDED' as action_type,
    refund_recipient_email,
    refund_amount,
    actual_creator_email,
    'DEBIT ' || refund_amount || ' FROM ' || refund_recipient_email || 
    ' AND CREDIT TO ' || actual_creator_email as suggested_correction,
    refund_reference
FROM wrongful_refunds
WHERE refund_status = 'WRONGFUL_REFUND'
  AND refund_recipient_email = 'jonahmafuyai@gmail.com'
ORDER BY refund_date DESC;