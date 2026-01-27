-- CURRENT INVESTIGATION: jonahmafuyai81@gmail.com Balance Analysis
-- Date: January 27, 2025
-- Issue: User has ₦439 but no visible deposit history

-- 1. Get current user profile and balance
SELECT 
    'CURRENT_USER_STATUS' as check_type,
    id,
    email,
    full_name,
    balance,
    total_spent,
    created_at,
    updated_at,
    is_active
FROM profiles 
WHERE email = 'jonahmafuyai81@gmail.com';

-- 2. Check ALL wallet transactions (including deposits)
SELECT 
    'ALL_WALLET_TRANSACTIONS' as check_type,
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
WHERE p.email = 'jonahmafuyai81@gmail.com'
ORDER BY wt.created_at DESC;

-- 3. Check ALL regular transactions (including deposits)
SELECT 
    'ALL_REGULAR_TRANSACTIONS' as check_type,
    t.id,
    t.type,
    t.amount,
    t.status,
    t.description,
    t.reference,
    t.external_reference,
    t.response_data,
    t.created_at
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE p.email = 'jonahmafuyai81@gmail.com'
ORDER BY t.created_at DESC;

-- 4. Calculate balance from wallet transactions
WITH balance_calculation AS (
    SELECT 
        p.id as user_id,
        p.email,
        p.balance as current_balance,
        COALESCE(SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END), 0) as calculated_balance
    FROM profiles p
    LEFT JOIN wallet_transactions wt ON p.id = wt.user_id
    WHERE p.email = 'jonahmafuyai81@gmail.com'
    GROUP BY p.id, p.email, p.balance
)
SELECT 
    'BALANCE_VERIFICATION' as check_type,
    user_id,
    email,
    current_balance,
    calculated_balance,
    (current_balance - calculated_balance) as discrepancy,
    CASE 
        WHEN ABS(current_balance - calculated_balance) < 0.01 THEN 'BALANCE_CORRECT'
        WHEN current_balance > calculated_balance THEN 'USER_HAS_EXCESS_FUNDS'
        ELSE 'USER_MISSING_FUNDS'
    END as status
FROM balance_calculation;

-- 5. Look for Flutterwave deposits or virtual account credits
SELECT 
    'FLUTTERWAVE_DEPOSITS' as check_type,
    t.id,
    t.type,
    t.amount,
    t.status,
    t.description,
    t.reference,
    t.external_reference,
    t.response_data,
    t.created_at
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE p.email = 'jonahmafuyai81@gmail.com'
  AND (
    t.type = 'deposit' OR
    t.description ILIKE '%flutterwave%' OR
    t.description ILIKE '%virtual%' OR
    t.description ILIKE '%deposit%' OR
    t.reference ILIKE '%FLW%' OR
    t.external_reference IS NOT NULL
  )
ORDER BY t.created_at DESC;

-- 6. Check for admin funding or corrections
SELECT 
    'ADMIN_ACTIONS' as check_type,
    wt.id,
    wt.type,
    wt.amount,
    wt.description,
    wt.reference,
    wt.created_at
FROM wallet_transactions wt
JOIN profiles p ON wt.user_id = p.id
WHERE p.email = 'jonahmafuyai81@gmail.com'
  AND (
    wt.description ILIKE '%admin%' OR
    wt.description ILIKE '%funding%' OR
    wt.description ILIKE '%correction%' OR
    wt.reference ILIKE '%ADMIN%'
  )
ORDER BY wt.created_at DESC;

-- 7. Check for gift-related credits or refunds
SELECT 
    'GIFT_RELATED_TRANSACTIONS' as check_type,
    wt.id,
    wt.type,
    wt.amount,
    wt.description,
    wt.reference,
    wt.created_at
FROM wallet_transactions wt
JOIN profiles p ON wt.user_id = p.id
WHERE p.email = 'jonahmafuyai81@gmail.com'
  AND (
    wt.description ILIKE '%gift%' OR
    wt.description ILIKE '%refund%' OR
    wt.reference ILIKE '%GIFT%' OR
    wt.reference ILIKE '%REFUND%'
  )
ORDER BY wt.created_at DESC;

-- 8. Check transaction history summary by type
SELECT 
    'TRANSACTION_SUMMARY' as check_type,
    t.type,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_positive,
    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_negative,
    SUM(t.amount) as net_amount,
    MIN(t.created_at) as first_transaction,
    MAX(t.created_at) as last_transaction
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE p.email = 'jonahmafuyai81@gmail.com'
GROUP BY t.type
ORDER BY net_amount DESC;

-- 9. Check wallet transaction summary by type
SELECT 
    'WALLET_SUMMARY' as check_type,
    wt.type,
    COUNT(*) as transaction_count,
    SUM(wt.amount) as total_amount,
    AVG(wt.amount) as average_amount,
    MIN(wt.created_at) as first_transaction,
    MAX(wt.created_at) as last_transaction
FROM wallet_transactions wt
JOIN profiles p ON wt.user_id = p.id
WHERE p.email = 'jonahmafuyai81@gmail.com'
GROUP BY wt.type
ORDER BY total_amount DESC;

-- 10. Look for any transactions around ₦439
SELECT 
    'TRANSACTIONS_NEAR_CURRENT_BALANCE' as check_type,
    'wallet_transactions' as source_table,
    wt.id,
    wt.type,
    wt.amount,
    wt.description,
    wt.reference,
    wt.created_at,
    ABS(wt.amount - 439) as difference_from_balance
FROM wallet_transactions wt
JOIN profiles p ON wt.user_id = p.id
WHERE p.email = 'jonahmafuyai81@gmail.com'
  AND ABS(wt.amount - 439) <= 50  -- Within ₦50 of current balance

UNION ALL

SELECT 
    'TRANSACTIONS_NEAR_CURRENT_BALANCE' as check_type,
    'transactions' as source_table,
    t.id,
    t.type,
    t.amount,
    t.description,
    t.reference,
    t.created_at,
    ABS(t.amount - 439) as difference_from_balance
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE p.email = 'jonahmafuyai81@gmail.com'
  AND ABS(t.amount - 439) <= 50  -- Within ₦50 of current balance

ORDER BY difference_from_balance ASC;