-- Verification queries for the virtual account BVN fix migration
-- Run these to ensure everything is working correctly

-- 1. Check overall virtual accounts summary
SELECT 'Virtual Accounts Summary' as check_name;
SELECT * FROM virtual_accounts_summary;

-- 2. Check for any suspicious accounts that need attention
SELECT 'Suspicious Accounts Check' as check_name;
SELECT * FROM check_suspicious_virtual_accounts();

-- 3. Verify database constraints are in place
SELECT 'Database Constraints' as check_name;
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  CASE contype 
    WHEN 'c' THEN 'CHECK'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
  END as constraint_description
FROM pg_constraint 
WHERE conrelid = 'virtual_accounts'::regclass
  AND conname LIKE '%virtual%' OR conname LIKE '%temporary%';

-- 4. Check recent virtual account activity
SELECT 'Recent Virtual Account Activity' as check_name;
SELECT 
  user_id,
  account_number,
  bank_name,
  is_temporary,
  expires_at,
  created_at
FROM virtual_accounts 
WHERE is_active = true
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check audit log functionality
SELECT 'Audit Log Check' as check_name;
SELECT 
  table_name,
  operation,
  details,
  created_at
FROM audit_log 
WHERE table_name = 'virtual_accounts'
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Test the cleanup function (dry run)
SELECT 'Cleanup Function Test' as check_name;
SELECT 
  COUNT(*) as expired_accounts_count
FROM virtual_accounts 
WHERE is_temporary = true 
  AND expires_at < NOW() 
  AND is_active = true;

-- 7. Check for users with multiple permanent accounts (should be 0)
SELECT 'Multiple Permanent Accounts Check' as check_name;
SELECT 
  user_id,
  COUNT(*) as permanent_account_count,
  array_agg(account_number) as account_numbers
FROM virtual_accounts 
WHERE is_active = true 
  AND is_temporary = false
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 8. Verify column constraints
SELECT 'Column Constraints' as check_name;
SELECT 
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns 
WHERE table_name = 'virtual_accounts' 
  AND column_name IN ('is_temporary', 'expires_at', 'expected_amount')
ORDER BY column_name;