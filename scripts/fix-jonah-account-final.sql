-- FINAL FIX for Jonah Mafuyai Account
-- User ID: 31aaa21d-d806-4667-8579-2ec4cdfdf247

-- 1. First, let's understand the complete transaction history
SELECT 
    'COMPLETE_TRANSACTION_ANALYSIS' as analysis_type,
    wt.id,
    wt.type,
    wt.amount,
    wt.description,
    wt.reference,
    wt.balance_before,
    wt.balance_after,
    wt.created_at,
    -- Calculate running balance
    SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END) 
        OVER (ORDER BY wt.created_at ROWS UNBOUNDED PRECEDING) as running_calculated_balance
FROM wallet_transactions wt
WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
ORDER BY wt.created_at ASC;

-- 2. Identify the legitimate balance (before our corrections)
WITH pre_correction_balance AS (
    SELECT 
        SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END) as calculated_balance
    FROM wallet_transactions wt
    WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
      AND wt.created_at < '2025-12-30 13:32:00'  -- Before our corrections
      AND wt.description NOT ILIKE '%correction%'
)
SELECT 
    'PRE_CORRECTION_ANALYSIS' as analysis_type,
    calculated_balance as legitimate_balance,
    950.00 as balance_before_correction,
    (950.00 - calculated_balance) as original_discrepancy
FROM pre_correction_balance;

-- 3. Remove our incorrect corrections and restore proper balance
-- Step 3a: Delete the correction transactions
DELETE FROM wallet_transactions 
WHERE user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND (
    reference LIKE 'BALANCE_CORRECTION_%' OR 
    reference LIKE 'EMERGENCY_CORRECTION_%'
  );

-- Step 3b: Delete corresponding transaction records
DELETE FROM transactions 
WHERE user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
  AND reference LIKE 'BALANCE_CORRECTION_%';

-- Step 3c: Calculate the correct balance based on remaining transactions
WITH correct_balance AS (
    SELECT 
        SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END) as calculated_balance
    FROM wallet_transactions wt
    WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
)
UPDATE profiles 
SET balance = (SELECT calculated_balance FROM correct_balance),
    updated_at = NOW()
WHERE id = '31aaa21d-d806-4667-8579-2ec4cdfdf247';

-- 4. Verify the fix
SELECT 
    'FINAL_VERIFICATION' as verification_type,
    p.id,
    p.email,
    p.balance as current_balance,
    COALESCE(SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END), 0) as calculated_balance,
    (p.balance - COALESCE(SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE -wt.amount END), 0)) as remaining_discrepancy
FROM profiles p
LEFT JOIN wallet_transactions wt ON p.id = wt.user_id
WHERE p.id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
GROUP BY p.id, p.email, p.balance;

-- 5. Show the clean transaction history
SELECT 
    'CLEAN_TRANSACTION_HISTORY' as history_type,
    wt.type,
    wt.amount,
    wt.description,
    wt.created_at
FROM wallet_transactions wt
WHERE wt.user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247'
ORDER BY wt.created_at DESC
LIMIT 15;

-- 6. Summary of what we found
SELECT 
    'ACCOUNT_SUMMARY' as summary_type,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits,
    SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
    COUNT(CASE WHEN description ILIKE '%refund%' THEN 1 END) as refund_count,
    COUNT(CASE WHEN description ILIKE '%withdrawal%' THEN 1 END) as withdrawal_count,
    COUNT(CASE WHEN description ILIKE '%gift%' THEN 1 END) as gift_count
FROM wallet_transactions
WHERE user_id = '31aaa21d-d806-4667-8579-2ec4cdfdf247';