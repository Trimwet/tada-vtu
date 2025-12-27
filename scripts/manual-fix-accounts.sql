-- Manual fix for the two specific users
-- Direct UPDATE statements to set correct account states

-- 1. Check current state first
SELECT 
  'Before Manual Fix' as status,
  p.email,
  va.id as va_id,
  va.user_id,
  va.account_number,
  va.is_temporary,
  va.expires_at,
  va.is_active
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuayi81@gmail.com')
ORDER BY p.email;

-- 2. Get the specific user IDs
SELECT 
  'User IDs' as info,
  id as user_id,
  email,
  full_name
FROM profiles 
WHERE email IN ('mafuyaijonah1@gmail.com', 'jonahmafuayi81@gmail.com')
ORDER BY email;

-- 3. DIRECT FIX: Set jonahmafuayi81@gmail.com to permanent (BVN verified)
UPDATE virtual_accounts 
SET 
  is_temporary = false,
  expires_at = NULL
WHERE user_id = (SELECT id FROM profiles WHERE email = 'jonahmafuayi81@gmail.com' LIMIT 1)
  AND is_active = true;

-- 4. DIRECT FIX: Set mafuyaijonah1@gmail.com to temporary (no BVN)
UPDATE virtual_accounts 
SET 
  is_temporary = true,
  expires_at = NOW() + INTERVAL '48 hours'  -- Give 48 hours instead of 24
WHERE user_id = (SELECT id FROM profiles WHERE email = 'mafuyaijonah1@gmail.com' LIMIT 1)
  AND is_active = true;

-- 5. Verify the manual fix worked
SELECT 
  'After Manual Fix' as status,
  p.email,
  va.account_number,
  va.is_temporary,
  va.expires_at,
  va.is_active,
  CASE 
    WHEN va.is_temporary = false THEN '✅ PERMANENT (BVN Verified)'
    WHEN va.is_temporary = true AND va.expires_at > NOW() THEN '⏰ TEMPORARY (Active)'
    WHEN va.is_temporary = true AND va.expires_at < NOW() THEN '❌ TEMPORARY (Expired)'
    ELSE '❓ UNKNOWN'
  END as account_status
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuayi81@gmail.com')
ORDER BY p.email;

-- 6. Final system health check
SELECT 
  'Final System Health' as check_type,
  COUNT(*) as total_active_accounts,
  COUNT(*) FILTER (WHERE is_temporary = false) as permanent_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true AND expires_at > NOW()) as active_temporary_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true AND expires_at < NOW()) as expired_temporary_accounts
FROM virtual_accounts 
WHERE is_active = true;

-- 7. Show which user has which type
SELECT 
  'User Account Types' as summary,
  p.email,
  CASE 
    WHEN va.is_temporary = false THEN 'PERMANENT'
    WHEN va.is_temporary = true THEN 'TEMPORARY'
    ELSE 'UNKNOWN'
  END as account_type,
  va.expires_at
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE va.is_active = true
  AND p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuayi81@gmail.com')
ORDER BY p.email;