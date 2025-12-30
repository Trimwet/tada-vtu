-- Quick Check for Jonah's Gift-Related Transactions
-- User ID: 31aaa21d-d806-4667-8579-2ec4cdfdf247

-- 1. Check all wallet transactions for gift/refund activity
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
WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND (
    wt.description ILIKE '%gift%' OR 
    wt.reference ILIKE '%gift%' OR
    wt.description ILIKE '%refund%'
  )
ORDER BY wt.created_at DESC;

-- 2. Check regular transactions for gift activity
SELECT 
    t.id,
    t.type,
    t.amount,
    t.status,
    t.description,
    t.reference,
    t.created_at
FROM transactions t
WHERE t.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND (
    t.description ILIKE '%gift%' OR 
    t.reference ILIKE '%gift%' OR
    t.type = 'gift'
  )
ORDER BY t.created_at DESC;

-- 3. Check for any refund transactions (potential wrongful refunds)
SELECT 
    wt.id,
    wt.type,
    wt.amount,
    wt.description,
    wt.reference,
    wt.created_at,
    'REFUND_ANALYSIS' as analysis_type
FROM wallet_transactions wt
WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND wt.type = 'credit'
  AND wt.description ILIKE '%refund%'
ORDER BY wt.created_at DESC;

-- 4. Recent transaction summary (last 30 days)
SELECT 
    t.type,
    COUNT(*) as transaction_count,
    SUM(t.amount) as total_amount,
    MIN(t.created_at) as first_transaction,
    MAX(t.created_at) as last_transaction
FROM transactions t
WHERE t.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND t.created_at >= NOW() - INTERVAL '30 days'
GROUP BY t.type
ORDER BY total_amount DESC;

-- 5. Wallet transaction summary (last 30 days)
SELECT 
    wt.type,
    COUNT(*) as transaction_count,
    SUM(wt.amount) as total_amount,
    MIN(wt.created_at) as first_transaction,
    MAX(wt.created_at) as last_transaction
FROM wallet_transactions wt
WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND wt.created_at >= NOW() - INTERVAL '30 days'
GROUP BY wt.type
ORDER BY total_amount DESC;

-- 6. Check if user has any suspicious refund patterns
SELECT 
    COUNT(*) as total_refunds,
    SUM(wt.amount) as total_refund_amount,
    AVG(wt.amount) as avg_refund_amount,
    MIN(wt.created_at) as first_refund,
    MAX(wt.created_at) as last_refund
FROM wallet_transactions wt
WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND wt.type = 'credit'
  AND wt.description ILIKE '%refund%';

-- 7. Account balance verification
SELECT 
    p.balance as current_balance,
    p.total_spent,
    COALESCE(SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE 0 END), 0) as total_credits,
    COALESCE(SUM(CASE WHEN wt.type = 'debit' THEN wt.amount ELSE 0 END), 0) as total_debits,
    COALESCE(SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END), 0) as calculated_balance
FROM profiles p
LEFT JOIN wallet_transactions wt ON p.id = wt.user_id
WHERE p.id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
GROUP BY p.id, p.balance, p.total_spent;