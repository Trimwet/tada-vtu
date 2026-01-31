-- Script to fix the SECURITY DEFINER view issue
-- Run this in your Supabase SQL Editor

-- First, let's see the current definition of the view
SELECT definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'virtual_accounts_summary';

-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.virtual_accounts_summary;

-- Example of how to recreate the view without SECURITY DEFINER
-- Replace this with your actual view definition
/*
CREATE VIEW public.virtual_accounts_summary AS
SELECT 
    va.id,
    va.user_id,
    va.account_number,
    va.account_name,
    va.bank_name,
    va.is_active,
    p.full_name as user_name,
    p.email as user_email
FROM virtual_accounts va
LEFT JOIN profiles p ON va.user_id = p.id
WHERE va.is_active = true;
*/

-- Enable RLS on the view (if needed)
-- ALTER VIEW public.virtual_accounts_summary ENABLE ROW LEVEL SECURITY;

-- Create appropriate RLS policies for the view
/*
CREATE POLICY "Users can view own virtual account summary" ON public.virtual_accounts_summary
  FOR SELECT USING (auth.uid() = user_id);
*/

-- Note: You'll need to replace the CREATE VIEW statement above 
-- with your actual view definition. Check your existing view first.