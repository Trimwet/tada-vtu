-- Restore proper account states after migration
-- The migration marked all accounts as temporary, but jonahmafuayi81@gmail.com should be permanent

-- 1. First, let's see the current state
SELECT 
  'Current State' as check_type,
  p.email,
  p.full_name,
  va.account_number,
  va.bank_name,
  va.is_temporary,
  va.expires_at,
  va.is_active,
  va.created_at
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuayi81@gmail.com')
ORDER BY p.email;

-- 2. Restore jonahmafuayi81@gmail.com to permanent status (they have BVN verification)
UPDATE virtual_accounts 
SET 
  is_temporary = false,
  expires_at = NULL,
  is_active = true
WHERE user_id IN (
  SELECT id FROM profiles WHERE email = 'jonahmafuayi81@gmail.com'
);

-- 3. Keep mafuyaijonah1@gmail.com as temporary but extend expiry and reactivate
UPDATE virtual_accounts 
SET 
  is_temporary = true,
  expires_at = NOW() + INTERVAL '24 hours',
  is_active = true
WHERE user_id IN (
  SELECT id FROM profiles WHERE email = 'mafuyaijonah1@gmail.com'
);

-- 4. Log the restoration
INSERT INTO audit_log (
  table_name, 
  operation, 
  details,
  created_at
) VALUES (
  'virtual_accounts',
  'RESTORE_ACCOUNTS',
  jsonb_build_object(
    'reason', 'Restore proper account states after migration',
    'jonahmafuayi81_status', 'Restored to permanent (has BVN)',
    'mafuyaijonah1_status', 'Set to temporary (no BVN)',
    'restored_by', 'admin_fix',
    'restore_date', NOW()
  ),
  NOW()
);

-- 5. Verify the restoration
SELECT 
  'After Restoration' as check_type,
  p.email,
  p.full_name,
  va.account_number,
  va.bank_name,
  va.is_temporary,
  va.expires_at,
  va.is_active,
  CASE 
    WHEN va.is_temporary = false THEN 'Permanent Account (BVN Verified)'
    WHEN va.is_temporary = true AND va.expires_at > NOW() THEN 'Temporary Account (Active)'
    WHEN va.is_temporary = true AND va.expires_at < NOW() THEN 'Temporary Account (Expired)'
    ELSE 'Unknown Status'
  END as account_status
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuayi81@gmail.com')
ORDER BY p.email;

-- 6. Check overall system health
SELECT 
  'System Health After Restoration' as check_type,
  COUNT(*) as total_active_accounts,
  COUNT(*) FILTER (WHERE is_temporary = false) as permanent_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true AND expires_at > NOW()) as active_temporary_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true AND expires_at < NOW()) as expired_temporary_accounts
FROM virtual_accounts 
WHERE is_active = true;

-- 7. Create notifications for the users
INSERT INTO notifications (user_id, type, title, message, created_at)
SELECT 
  p.id,
  'success',
  'Virtual Account Restored',
  'Your permanent virtual account has been restored. You can continue using it for bank transfers.',
  NOW()
FROM profiles p
WHERE p.email = 'jonahmafuayi81@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM notifications n 
  WHERE n.user_id = p.id 
    AND n.title = 'Virtual Account Restored'
    AND n.created_at > NOW() - INTERVAL '1 hour'
);

INSERT INTO notifications (user_id, type, title, message, created_at)
SELECT 
  p.id,
  'info',
  'Temporary Virtual Account Active',
  'Your virtual account is now temporary (24 hours). To get a permanent account, please provide your BVN in the fund wallet section.',
  NOW()
FROM profiles p
WHERE p.email = 'mafuyaijonah1@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM notifications n 
  WHERE n.user_id = p.id 
    AND n.title = 'Temporary Virtual Account Active'
    AND n.created_at > NOW() - INTERVAL '1 hour'
);