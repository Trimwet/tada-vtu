-- Find Balance Discrepancy for Jonah Mafuyai
-- User ID: 31aaa21d-d806-4667-8579-2ec4cdfdf247
-- Expected Balance: ₦300.00, Actual Balance: ₦950.00, Discrepancy: ₦650.00

-- 1. Get all wallet transactions in chronological order with running balance
WITH transaction_history AS (
    SELECT 
        wt.id,
        wt.type,
        wt.amount,
        wt.description,
        wt.reference,
        wt.balance_before,
        wt.balance_after,
        wt.created_at,
        -- Calculate what balance should be based on previous transaction
        LAG(wt.balance_after, 1, 0) OVER (ORDER BY wt.created_at) as expected_balance_before,
        -- Calculate running total
        SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END) 
            OVER (ORDER BY wt.created_at ROWS UNBOUNDED PRECEDING) as running_balance
    FROM wallet_transactions wt
    WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
    ORDER BY wt.created_at
)

SELECT 
    id,
    type,
    amount,
    description,
    reference,
    balance_before,
    balance_after,
    expected_balance_before,
    running_balance,
    created_at,
    -- Flag discrepancies
    CASE 
        WHEN ABS(balance_before - expected_balance_before) > 0.01 THEN 'BALANCE_MISMATCH'
        WHEN ABS(balance_after - (balance_before + CASE WHEN type = 'credit' THEN amount ELSE -amount END)) > 0.01 THEN 'CALCULATION_ERROR'
        ELSE 'OK'
    END as status
FROM transaction_history
ORDER BY created_at DESC;

-- 2. Look for suspicious credit transactions (potential wrongful refunds)
SELECT 
    wt.id,
    wt.amount,
    wt.description,
    wt.reference,
    wt.balance_before,
    wt.balance_after,
    wt.created_at,
    'SUSPICIOUS_CREDIT' as flag
FROM wallet_transactions wt
WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND wt.type = 'credit'
  AND (
    wt.description ILIKE '%refund%' OR
    wt.description ILIKE '%gift%' OR
    wt.description ILIKE '%correction%' OR
    wt.amount >= 500  -- Large credits
  )
ORDER BY wt.created_at DESC;

-- 3. Check for duplicate transactions or references
SELECT 
    wt.reference,
    COUNT(*) as transaction_count,
    SUM(wt.amount) as total_amount,
    STRING_AGG(wt.type, ', ') as transaction_types,
    MIN(wt.created_at) as first_occurrence,
    MAX(wt.created_at) as last_occurrence
FROM wallet_transactions wt
WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND wt.reference IS NOT NULL
GROUP BY wt.reference
HAVING COUNT(*) > 1  -- Multiple transactions with same reference
ORDER BY total_amount DESC;

-- 4. Find the exact ₦650 discrepancy source
WITH balance_reconstruction AS (
    SELECT 
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) as calculated_balance
    FROM wallet_transactions 
    WHERE user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
),
current_balance AS (
    SELECT balance as actual_balance
    FROM profiles 
    WHERE id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
)

SELECT 
    br.total_credits,
    br.total_debits,
    br.calculated_balance,
    cb.actual_balance,
    (cb.actual_balance - br.calculated_balance) as discrepancy,
    CASE 
        WHEN (cb.actual_balance - br.calculated_balance) > 0 THEN 'USER_HAS_EXCESS_FUNDS'
        WHEN (cb.actual_balance - br.calculated_balance) < 0 THEN 'USER_OWES_MONEY'
        ELSE 'BALANCE_CORRECT'
    END as discrepancy_type
FROM balance_reconstruction br, current_balance cb;

-- 5. Look for transactions around ₦650 that might explain the discrepancy
SELECT 
    wt.id,
    wt.type,
    wt.amount,
    wt.description,
    wt.reference,
    wt.created_at,
    ABS(wt.amount - 650) as difference_from_discrepancy
FROM wallet_transactions wt
WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND wt.type = 'credit'
  AND wt.amount BETWEEN 600 AND 700  -- Close to ₦650
ORDER BY difference_from_discrepancy ASC;

-- 6. Check for recent large transactions that might be wrongful
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
  AND wt.created_at >= NOW() - INTERVAL '30 days'  -- Last 30 days
  AND wt.amount >= 100  -- Significant amounts
ORDER BY wt.created_at DESC;

-- 7. Generate correction recommendation
SELECT 
    '31aaa21d-d806-4667-8579-2ec4cdfdf247' as user_id,
    'jonahmafuyai@gmail.com' as user_email,
    950.00 as current_balance,
    300.00 as correct_balance,
    650.00 as excess_amount,
    'DEBIT ₦650.00 FROM USER ACCOUNT' as recommended_action,
    'Balance discrepancy correction - user has excess funds' as correction_reason;