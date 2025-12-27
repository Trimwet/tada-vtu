-- Check what happened to jonahmafuayi81@gmail.com account

-- 1. Check if the user exists in profiles
SELECT 
  'User Profile Check' as check_type,
  id,
  email,
  full_name,
  created_at
FROM profiles 
WHERE email = 'jonahmafuayi81@gmail.com';

-- 2. Check if they have any virtual accounts (active or inactive)
SELECT 
  'Virtual Account Check' as check_type,
  va.id,
  va.user_id,
  va.account_number,
  va.bank_name,
  va.is_temporary,
  va.expires_at,
  va.is_active,
  va.created_at,
  p.email
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
WHERE p.email = 'jonahmafuayi81@gmail.com';

-- 3. Check all virtual accounts to see the full picture
SELECT 
  'All Virtual Accounts' as check_type,
  va.id,
  p.email,
  va.account_number,
  va.is_temporary,
  va.is_active,
  va.expires_at
FROM virtual_accounts va
JOIN profiles p ON va.user_id = p.id
ORDER BY va.created_at DESC;

-- 4. If jonahmafuayi81@gmail.com doesn't have an account, we need to create one
-- First check if they exist as a user
DO $$
DECLARE
  user_exists boolean;
  user_id_val uuid;
BEGIN
  SELECT EXISTS(SELECT 1 FROM profiles WHERE email = 'jonahmafuayi81@gmail.com') INTO user_exists;
  
  IF user_exists THEN
    SELECT id INTO user_id_val FROM profiles WHERE email = 'jonahmafuayi81@gmail.com';
    
    -- Check if they have any virtual account
    IF NOT EXISTS(SELECT 1 FROM virtual_accounts WHERE user_id = user_id_val) THEN
      RAISE NOTICE 'User jonahmafuayi81@gmail.com exists but has no virtual account';
    ELSE
      RAISE NOTICE 'User jonahmafuayi81@gmail.com has virtual account(s)';
    END IF;
  ELSE
    RAISE NOTICE 'User jonahmafuayi81@gmail.com does not exist in profiles table';
  END IF;
END $$;