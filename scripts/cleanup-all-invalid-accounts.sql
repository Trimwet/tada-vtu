-- Comprehensive cleanup of all virtual accounts that violate BVN validation rules
-- This script finds and fixes accounts that are marked as permanent but shouldn't be

-- 1. Find all suspicious permanent accounts (created recently without proper validation)
SELECT 
  'Suspicious Permanent Accounts' as check_type,
  va.id,
  va.user_id,
  va.account_number,
  va.bank_name,
  va.is_temporary,
  va.created_at,
  p.email,
  p.full_name,
  CASE 
    WHEN va.created_at > NOW() - INTERVAL '7 days' THEN 'Recent account (suspicious)'
    WHEN va.created_at > NOW() - INTERVAL '30 days' THEN 'Month old account (review needed)'
    ELSE 'Old account (likely legitimate)'
  END as risk_level
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE va.is_active = true
  AND va.is_temporary = false
  AND va.created_at > NOW() - INTERVAL '30 days' -- Focus on recent accounts
ORDER BY va.created_at DESC;

-- 2. Mark recent suspicious permanent accounts as temporary
-- This is a safety measure for accounts created in the last 7 days
UPDATE virtual_accounts 
SET 
  is_temporary = true,
  expires_at = NOW() + INTERVAL '24 hours'
WHERE is_active = true
  AND is_temporary = false
  AND created_at > NOW() - INTERVAL '7 days' -- Only very recent accounts
  AND user_id NOT IN (
    -- Exclude the verified user who has proper BVN
    SELECT id FROM profiles WHERE email = 'jonahmafuayi81@gmail.com'
  );

-- 3. Log all the changes made
INSERT INTO audit_log (
  table_name, 
  operation, 
  details,
  created_at
) VALUES (
  'virtual_accounts',
  'BULK_CLEANUP',
  jsonb_build_object(
    'reason', 'Cleanup of accounts created without proper BVN validation',
    'action', 'Marked recent permanent accounts as temporary',
    'timeframe', 'Last 7 days',
    'excluded_verified_user', 'jonahmafuayi81@gmail.com',
    'cleanup_date', NOW()
  ),
  NOW()
);

-- 4. Create a notification for affected users
-- This will inform them they need to create a proper permanent account with BVN
INSERT INTO notifications (user_id, type, title, message, created_at)
SELECT 
  va.user_id,
  'info',
  'Virtual Account Update Required',
  'Your virtual account has been converted to temporary status. To get a permanent account, please provide your BVN in the fund wallet section.',
  NOW()
FROM virtual_accounts va
WHERE va.is_active = true
  AND va.is_temporary = true
  AND va.expires_at > NOW()
  AND va.expires_at < NOW() + INTERVAL '25 hours' -- Recently updated accounts
  AND NOT EXISTS (
    -- Don't send duplicate notifications
    SELECT 1 FROM notifications n 
    WHERE n.user_id = va.user_id 
      AND n.title = 'Virtual Account Update Required'
      AND n.created_at > NOW() - INTERVAL '1 hour'
  );

-- 5. Summary of changes made
SELECT 
  'Cleanup Summary' as report_type,
  COUNT(*) as total_accounts_affected,
  COUNT(*) FILTER (WHERE is_temporary = true AND expires_at > NOW()) as converted_to_temporary,
  COUNT(*) FILTER (WHERE is_active = false) as deactivated_accounts
FROM virtual_accounts 
WHERE updated_at > NOW() - INTERVAL '1 hour';

-- 6. Final verification - show current state
SELECT 
  'Final State Check' as check_type,
  COUNT(*) as total_active_accounts,
  COUNT(*) FILTER (WHERE is_temporary = false) as permanent_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true) as temporary_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true AND expires_at < NOW()) as expired_accounts
FROM virtual_accounts 
WHERE is_active = true;

-- 7. Show specific users mentioned
SELECT 
  'Specific Users Check' as check_type,
  p.email,
  p.full_name,
  va.account_number,
  va.bank_name,
  va.is_temporary,
  va.expires_at,
  CASE 
    WHEN va.is_temporary = false THEN 'Permanent (BVN verified)'
    WHEN va.is_temporary = true AND va.expires_at > NOW() THEN 'Temporary (expires soon)'
    WHEN va.is_temporary = true AND va.expires_at < NOW() THEN 'Expired'
    ELSE 'Unknown status'
  END as account_status
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuayi81@gmail.com')
  AND va.is_active = true
ORDER BY p.email;