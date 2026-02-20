-- Fix duplicate phone number issue
-- The number 09063546728 is currently assigned to kendricksushi@gmail.com
-- We need to move it to jonahmafuyai81@gmail.com

-- Step 1: Check current situation
SELECT 
  id, 
  email, 
  full_name, 
  phone_number,
  balance
FROM profiles 
WHERE phone_number = '09063546728' OR email IN ('jonahmafuyai81@gmail.com', 'kendricksushi@gmail.com')
ORDER BY email;

-- Step 2: Clear the phone number from the other account
UPDATE profiles
SET 
  phone_number = NULL,
  updated_at = NOW()
WHERE email = 'kendricksushi@gmail.com';

-- Step 3: Assign the phone number to Jonah's account
UPDATE profiles
SET 
  phone_number = '09063546728',
  updated_at = NOW()
WHERE email = 'jonahmafuyai81@gmail.com';

-- Step 4: Verify the fix
SELECT 
  id, 
  email, 
  full_name, 
  phone_number,
  balance
FROM profiles 
WHERE email IN ('jonahmafuyai81@gmail.com', 'kendricksushi@gmail.com')
ORDER BY email;
