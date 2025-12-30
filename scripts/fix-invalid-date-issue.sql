-- Fix Invalid Date Issues in User Profiles
-- This script identifies and fixes date-related issues

-- 1. Check for users with invalid or NULL created_at dates
SELECT 
    id,
    full_name,
    email,
    created_at,
    updated_at,
    CASE 
        WHEN created_at IS NULL THEN 'NULL created_at'
        WHEN created_at::text = 'Invalid Date' THEN 'Invalid Date string'
        WHEN created_at < '2020-01-01' THEN 'Date too old'
        WHEN created_at > NOW() + INTERVAL '1 day' THEN 'Future date'
        ELSE 'Valid'
    END as date_status
FROM profiles 
WHERE email = 'jonahmafuyai@gmail.com'
   OR created_at IS NULL 
   OR created_at < '2020-01-01'
   OR created_at > NOW() + INTERVAL '1 day';

-- 2. Fix NULL or invalid created_at dates
UPDATE profiles 
SET 
    created_at = COALESCE(updated_at, NOW()),
    updated_at = NOW()
WHERE created_at IS NULL 
   OR created_at < '2020-01-01'
   OR created_at > NOW() + INTERVAL '1 day';

-- 3. Specifically check and fix jonahmafuyai@gmail.com if needed
UPDATE profiles 
SET 
    created_at = CASE 
        WHEN created_at IS NULL OR created_at < '2020-01-01' THEN 
            COALESCE(updated_at, '2024-01-01 00:00:00'::timestamp)
        ELSE created_at
    END,
    updated_at = NOW()
WHERE email = 'jonahmafuyai@gmail.com';

-- 4. Check for invalid dates in other timestamp fields
SELECT 
    'gift_rooms' as table_name,
    COUNT(*) as invalid_count
FROM gift_rooms 
WHERE created_at IS NULL 
   OR expires_at IS NULL
   OR created_at < '2020-01-01'
   OR expires_at < created_at

UNION ALL

SELECT 
    'transactions' as table_name,
    COUNT(*) as invalid_count
FROM transactions 
WHERE created_at IS NULL 
   OR created_at < '2020-01-01'

UNION ALL

SELECT 
    'wallet_transactions' as table_name,
    COUNT(*) as invalid_count
FROM wallet_transactions 
WHERE created_at IS NULL 
   OR created_at < '2020-01-01';

-- 5. Fix invalid dates in related tables
UPDATE gift_rooms 
SET created_at = NOW()
WHERE created_at IS NULL OR created_at < '2020-01-01';

UPDATE gift_rooms 
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL OR expires_at < created_at;

UPDATE transactions 
SET created_at = NOW()
WHERE created_at IS NULL OR created_at < '2020-01-01';

UPDATE wallet_transactions 
SET created_at = NOW()
WHERE created_at IS NULL OR created_at < '2020-01-01';

-- 6. Verify the fixes
SELECT 
    id,
    full_name,
    email,
    created_at,
    updated_at,
    'Fixed' as status
FROM profiles 
WHERE email = 'jonahmafuyai@gmail.com';

-- 7. Add constraints to prevent future invalid dates (optional)
-- ALTER TABLE profiles ADD CONSTRAINT check_created_at_valid 
--     CHECK (created_at >= '2020-01-01' AND created_at <= NOW() + INTERVAL '1 day');

-- 8. Create a function to validate and fix dates automatically
CREATE OR REPLACE FUNCTION fix_invalid_dates()
RETURNS void AS $$
BEGIN
    -- Fix profiles
    UPDATE profiles 
    SET created_at = COALESCE(updated_at, NOW())
    WHERE created_at IS NULL OR created_at < '2020-01-01';
    
    -- Fix gift_rooms
    UPDATE gift_rooms 
    SET created_at = NOW()
    WHERE created_at IS NULL OR created_at < '2020-01-01';
    
    -- Fix transactions
    UPDATE transactions 
    SET created_at = NOW()
    WHERE created_at IS NULL OR created_at < '2020-01-01';
    
    -- Fix wallet_transactions
    UPDATE wallet_transactions 
    SET created_at = NOW()
    WHERE created_at IS NULL OR created_at < '2020-01-01';
    
    RAISE NOTICE 'Invalid dates have been fixed';
END;
$$ LANGUAGE plpgsql;