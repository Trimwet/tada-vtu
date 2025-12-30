-- Check Database Schema for Gift Room Tables
-- This will help us understand the actual column names

-- 1. Check if gift_rooms table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'gift_rooms' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check gift_reservations table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'gift_reservations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check gift_claims table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'gift_claims' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check gift_room_activities table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'gift_room_activities' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. List all tables that contain 'gift' in the name
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%gift%'
ORDER BY table_name;

-- 6. Check profiles table structure to confirm user ID column
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'user_id', 'creator_id', 'sender_id')
ORDER BY column_name;