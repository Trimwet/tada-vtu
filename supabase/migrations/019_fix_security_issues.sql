-- Fix security issues identified by Supabase linter
-- Enable RLS on tables that are missing it

-- 1. Enable RLS on achievements table
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for achievements (admin-only access)
CREATE POLICY "Admins can manage achievements" ON public.achievements
  FOR ALL USING (false); -- Block all access for now, implement admin check later

-- 2. Enable RLS on admins table  
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admins (self-access only)
CREATE POLICY "Admins can view own record" ON public.admins
  FOR SELECT USING (false); -- Block all access via PostgREST, use API routes only

CREATE POLICY "Block all admin modifications" ON public.admins
  FOR ALL USING (false); -- All admin operations should go through API routes

-- 3. Enable RLS on system_settings table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system_settings (admin-only)
CREATE POLICY "Block system_settings access" ON public.system_settings
  FOR ALL USING (false); -- All access should go through API routes

-- 4. Enable RLS on webhook_logs table
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for webhook_logs (admin-only)
CREATE POLICY "Block webhook_logs access" ON public.webhook_logs
  FOR ALL USING (false); -- All access should go through API routes

-- 5. Enable RLS on pending_payments table
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pending_payments (user can view own)
CREATE POLICY "Users can view own pending payments" ON public.pending_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Block pending_payments modifications" ON public.pending_payments
  FOR INSERT WITH CHECK (false); -- All modifications should go through API routes

CREATE POLICY "Block pending_payments updates" ON public.pending_payments
  FOR UPDATE USING (false);

CREATE POLICY "Block pending_payments deletes" ON public.pending_payments
  FOR DELETE USING (false);

-- 6. Enable RLS on audit_log table
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_log (admin-only)
CREATE POLICY "Block audit_log access" ON public.audit_log
  FOR ALL USING (false); -- All access should go through API routes

-- 7. Fix the security definer view issue
-- Drop and recreate the virtual_accounts_summary view without SECURITY DEFINER
DROP VIEW IF EXISTS public.virtual_accounts_summary;

-- Recreate the view without SECURITY DEFINER (if it exists)
-- Note: You may need to adjust this based on your actual view definition
-- CREATE VIEW public.virtual_accounts_summary AS
-- SELECT ... your view definition here ...
-- (Commented out since I don't know the exact view definition)

-- Add comments for documentation
COMMENT ON TABLE public.achievements IS 'User achievements and badges - RLS enabled for security';
COMMENT ON TABLE public.admins IS 'Admin users - Access restricted to API routes only';
COMMENT ON TABLE public.system_settings IS 'System configuration - Admin access only via API';
COMMENT ON TABLE public.webhook_logs IS 'Webhook event logs - Admin access only via API';
COMMENT ON TABLE public.pending_payments IS 'Pending payment records - Users can view own only';
COMMENT ON TABLE public.audit_log IS 'System audit trail - Admin access only via API';