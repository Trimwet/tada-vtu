-- Final fix for both users with correct email addresses

-- 1. Current state check
SELECT 
  'Current State' as status,
  p.email,
  va.account_number,
  va.is_temporary,
  va.expires_at,
  va.is_active,
  CASE 
    WHEN va.expires_at < NOW() THEN 'EXPIRED'
    WHEN va.is_temporary = true THEN 'TEMPORARY (Active)'
    WHEN va.is_temporary = false THEN 'PERMANENT'
    ELSE 'UNKNOWN'
  END as current_status
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuyai81@gmail.com')
ORDER BY p.email;

-- 2. Fix jonahmafuyai81@gmail.com - Set to PERMANENT (BVN verified user)
UPDATE virtual_accounts 
SET 
  is_temporary = false,
  expires_at = NULL
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'jonahmafuyai81@gmail.com' LIMIT 1
);

-- 3. Fix mafuyaijonah1@gmail.com - Keep as TEMPORARY but extend expiry (no BVN)
UPDATE virtual_accounts 
SET 
  is_temporary = true,
  expires_at = NOW() + INTERVAL '7 days'  -- Give them a week to provide BVN
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'mafuyaijonah1@gmail.com' LIMIT 1
);

-- 4. Verify the final fix
SELECT 
  'After Final Fix' as status,
  p.email,
  va.account_number,
  va.bank_name,
  va.is_temporary,
  va.expires_at,
  va.is_active,
  CASE 
    WHEN va.is_temporary = false THEN '✅ PERMANENT (BVN Verified)'
    WHEN va.is_temporary = true AND va.expires_at > NOW() THEN '⏰ TEMPORARY (Active until ' || va.expires_at::date || ')'
    WHEN va.is_temporary = true AND va.expires_at < NOW() THEN '❌ TEMPORARY (Expired)'
    ELSE '❓ UNKNOWN'
  END as final_status
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuyai81@gmail.com')
ORDER BY p.email;

-- 5. Final system health check
SELECT 
  'Final System Health' as check_type,
  COUNT(*) as total_active_accounts,
  COUNT(*) FILTER (WHERE is_temporary = false) as permanent_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true AND expires_at > NOW()) as active_temporary_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true AND expires_at < NOW()) as expired_temporary_accounts
FROM virtual_accounts 
WHERE is_active = true;

-- 6. Log the final fix
INSERT INTO audit_log (
  table_name, 
  operation, 
  details,
  created_at
) VALUES (
  'virtual_accounts',
  'FINAL_FIX',
  jsonb_build_object(
    'jonahmafuyai81_gmail', 'Set to PERMANENT (BVN verified)',
    'mafuyaijonah1_gmail', 'Set to TEMPORARY (no BVN, 7 days expiry)',
    'fixed_by', 'admin_final_fix',
    'fix_date', NOW(),
    'note', 'Corrected account types based on BVN verification status'
  ),
  NOW()
);

-- 7. Create appropriate notifications
INSERT INTO notifications (user_id, type, title, message, created_at)
SELECT 
  p.id,
  'success',
  'Permanent Virtual Account Active',
  'Your permanent virtual account is now active. You can transfer any amount anytime to fund your wallet.',
  NOW()
FROM profiles p
WHERE p.email = 'jonahmafuyai81@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM notifications n 
  WHERE n.user_id = p.id 
    AND n.title = 'Permanent Virtual Account Active'
    AND n.created_at > NOW() - INTERVAL '1 hour'
);

INSERT INTO notifications (user_id, type, title, message, created_at)
SELECT 
  p.id,
  'info',
  'Temporary Account Extended',
  'Your temporary virtual account has been extended for 7 days. To get a permanent account, please provide your BVN in the fund wallet section.',
  NOW()
FROM profiles p
WHERE p.email = 'mafuyaijonah1@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM notifications n 
  WHERE n.user_id = p.id 
    AND n.title = 'Temporary Account Extended'
    AND n.created_at > NOW() - INTERVAL '1 hour'
);