-- 028: User Analytics Tables
-- Tracks frequently bought plans, user sessions, and device info

-- 1. User Plan Preferences (frequently bought plans per user)
CREATE TABLE IF NOT EXISTS public.user_plan_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('data', 'airtime')),
  network TEXT,
  plan_id TEXT,
  plan_name TEXT,
  amount DECIMAL(12,2),
  purchase_count INTEGER DEFAULT 1,
  last_purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_type, plan_id)
);

-- 2. User Sessions (IP + device tracking)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  session_count INTEGER DEFAULT 1,
  UNIQUE(user_id, ip_address, user_agent)
);

-- 3. Add IP and user-agent columns to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_plan_preferences_user ON public.user_plan_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_preferences_count ON public.user_plan_preferences(user_id, purchase_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen_at DESC);

-- RLS
ALTER TABLE public.user_plan_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- User Plan Preferences policies
CREATE POLICY "Users can view own plan preferences" ON public.user_plan_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan preferences" ON public.user_plan_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan preferences" ON public.user_plan_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- User Sessions policies
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role can access all plan preferences" ON public.user_plan_preferences
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all sessions" ON public.user_sessions
  FOR ALL USING (auth.role() = 'service_role');
