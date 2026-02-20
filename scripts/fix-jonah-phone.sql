-- Fix Jonah's account by adding phone number
-- This will allow OpenClaw to identify the account

-- Update the Jonah account with the correct phone number
UPDATE profiles
SET 
  phone_number = '09063546728',
  updated_at = NOW()
WHERE email = 'jonahmafuyai81@gmail.com';

-- Verify the update
SELECT 
  id,
  full_name,
  email,
  phone_number,
  balance,
  is_active
FROM profiles
WHERE email = 'jonahmafuyai81@gmail.com';
