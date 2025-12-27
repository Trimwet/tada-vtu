-- Test what the API should return for each user

-- 1. Check what's in the database for both users
SELECT 
  'Database State' as check_type,
  p.email,
  p.id as user_id,
  va.account_number,
  va.is_temporary,
  va.is_active,
  va.expires_at,
  CASE 
    WHEN va.is_temporary = false AND va.is_active = true THEN 'API should SHOW this account'
    WHEN va.is_temporary = true AND va.is_active = true THEN 'API should HIDE this account'
    WHEN va.is_active = false THEN 'API should HIDE this account (inactive)'
    ELSE 'Unknown state'
  END as api_behavior
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuyai81@gmail.com')
ORDER BY p.email;

-- 2. Simulate the API query for mafuyaijonah1@gmail.com (should return NO results)
SELECT 
  'API Query for mafuyaijonah1@gmail.com' as test_type,
  COUNT(*) as should_be_zero,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CORRECT - No permanent account found'
    ELSE '❌ WRONG - Found permanent account when user has no BVN'
  END as result
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email = 'mafuyaijonah1@gmail.com'
  AND va.is_active = true
  AND va.is_temporary = false;

-- 3. Simulate the API query for jonahmafuyai81@gmail.com (should return 1 result)
SELECT 
  'API Query for jonahmafuyai81@gmail.com' as test_type,
  COUNT(*) as should_be_one,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ CORRECT - Found permanent account for BVN verified user'
    WHEN COUNT(*) = 0 THEN '❌ WRONG - No permanent account found for BVN verified user'
    ELSE '❌ WRONG - Multiple permanent accounts found'
  END as result
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email = 'jonahmafuyai81@gmail.com'
  AND va.is_active = true
  AND va.is_temporary = false;

-- 4. Show what each user should see in the frontend
SELECT 
  'Frontend Expectation' as summary,
  p.email,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM virtual_accounts va2 
      WHERE va2.user_id = p.id 
        AND va2.is_active = true 
        AND va2.is_temporary = false
    ) THEN 'Should see PERMANENT virtual account'
    ELSE 'Should see BVN input form (no permanent account)'
  END as frontend_should_show
FROM profiles p
WHERE p.email IN ('mafuyaijonah1@gmail.com', 'jonahmafuyai81@gmail.com')
ORDER BY p.email;