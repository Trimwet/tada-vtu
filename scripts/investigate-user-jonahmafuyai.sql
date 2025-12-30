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

-- 2. Check if gift_rooms table exists and what columns it has
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'gift_rooms' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check all gift-related tables that exist
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%gift%'
ORDER BY table_name;

-- 4. Check wallet transactions for gift-related activities
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

-- 5. Check regular transactions for gift-related activities
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

-- 6. Check for any refund transactions that might be wrongful
SELECT 
    wt.id,
    wt.type,
    wt.amount,
    wt.description,
    wt.reference,
    wt.created_at,
    p.email,
    p.full_name
FROM wallet_transactions wt
JOIN profiles p ON wt.user_id = p.id
WHERE p.email = 'jonahmafuyai@gmail.com'
  AND wt.type = 'credit'
  AND wt.description ILIKE '%refund%'
ORDER BY wt.created_at DESC;

-- 7. Check user's overall transaction history for patterns
SELECT 
    t.type,
    COUNT(*) as transaction_count,
    SUM(t.amount) as total_amount,
    MIN(t.created_at) as first_transaction,
    MAX(t.created_at) as last_transaction
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE p.email = 'jonahmafuyai@gmail.com'
GROUP BY t.type
ORDER BY total_amount DESC;

-- 8. Check wallet transaction summary
SELECT 
    wt.type,
    COUNT(*) as transaction_count,
    SUM(wt.amount) as total_amount,
    MIN(wt.created_at) as first_transaction,
    MAX(wt.created_at) as last_transaction
FROM wallet_transactions wt
JOIN profiles p ON wt.user_id = p.id
WHERE p.email = 'jonahmafuyai@gmail.com'
GROUP BY wt.type
ORDER BY total_amount DESC;

-- 9. Look for suspicious refund patterns
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
ORDER BY total_refunded DESC;

-- 10. Check current account status
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.balance,
    p.total_spent,
    p.created_at,
    p.is_active,
    CASE 
        WHEN p.created_at IS NULL THEN 'NULL created_at'
        WHEN p.created_at < '2020-01-01' THEN 'Invalid old date'
        WHEN p.created_at > NOW() + INTERVAL '1 day' THEN 'Future date'
        ELSE 'Valid date'
    END as date_status
FROM profiles p
WHERE p.email = 'jonahmafuyai@gmail.com';