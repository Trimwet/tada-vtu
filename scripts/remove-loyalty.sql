-- Migration: Remove Loyalty Features
-- Run this in Supabase SQL Editor to remove loyalty tables and columns

-- 1. Drop loyalty-related tables (if they exist)
DROP TABLE IF EXISTS public.spin_history CASCADE;
DROP TABLE IF EXISTS public.loyalty_transactions CASCADE;

-- 2. Drop loyalty functions (if they exist)
DROP FUNCTION IF EXISTS public.award_loyalty_points(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.process_daily_login(UUID);

-- 3. Remove loyalty columns from profiles table (optional - data will be retained but unused)
-- Uncomment these lines if you want to remove the columns completely:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS loyalty_points;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS loyalty_tier;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS total_points_earned;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS login_streak;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS longest_streak;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_login_date;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS spin_available;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_spin_date;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS birthday;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS total_spent;

-- Note: The loyalty code has been removed from the application.
-- The columns remain in the database to preserve existing user data.
-- If you want to completely remove loyalty data, uncomment the ALTER statements above.
