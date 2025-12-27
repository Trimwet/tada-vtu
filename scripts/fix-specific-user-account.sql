-- Fix for specific user: mafuyaijonah1@gmail.com
-- This user has a dedicated account without providing BVN, which violates business rules

-- 1. First, let's identify the problematic account
SELECT 
  va.id,
  va.user_id,
  va.account_number,
  va.bank_name,
  va.is_temporary,
  va.created_at,
  p.email,
  p.full_name
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email = 'mafuyaijonah1@gmail.com'
  AND va.is_active = true;

-- 2. Check if this account should be permanent or temporary
-- Since no BVN was provided, it should be marked as temporary or deactivated

-- OPTION A: Mark the account as temporary with 24-hour expiry (recommended)
-- This gives the user time to create a proper permanent account with BVN
UPDATE virtual_accounts 
SET 
  is_temporary = true,
  expires_at = NOW() + INTERVAL '24 hours'
WHERE user_id IN (
  SELECT id FROM profiles WHERE email = 'mafuyaijonah1@gmail.com'
)
AND is_active = true
AND is_temporary = false;

-- OPTION B: Deactivate the account entirely (more strict)
-- Uncomment this if you prefer to completely remove the account
/*
UPDATE virtual_accounts 
SET is_active = false
WHERE user_id IN (
  SELECT id FROM profiles WHERE email = 'mafuyaijonah1@gmail.com'
)
AND is_active = true
AND is_temporary = false;
*/

-- 3. Log this action for audit purposes
INSERT INTO audit_log (
  table_name, 
  operation, 
  user_id,
  details,
  created_at
) 
SELECT 
  'virtual_accounts',
  'MANUAL_FIX',
  p.id,
  jsonb_build_object(
    'email', p.email,
    'reason', 'Account had permanent status without BVN validation',
    'action', 'Marked as temporary with 24h expiry',
    'fixed_by', 'admin_manual_fix'
  ),
  NOW()
FROM profiles p 
WHERE p.email = 'mafuyaijonah1@gmail.com';

-- 4. Verify the fix
SELECT 
  'After Fix - mafuyaijonah1@gmail.com' as status,
  va.account_number,
  va.bank_name,
  va.is_temporary,
  va.expires_at,
  va.is_active
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email = 'mafuyaijonah1@gmail.com';

-- 5. Verify the verified user still has their permanent account
SELECT 
  'Verified User - jonahmafuayi81@gmail.com' as status,
  va.account_number,
  va.bank_name,
  va.is_temporary,
  va.expires_at,
  va.is_active
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email = 'jonahmafuayi81@gmail.com';

-- 6. Check overall system health after fix
SELECT * FROM virtual_accounts_summary;