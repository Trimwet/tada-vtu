-- Add system_settings table for polling system
-- Run this in Supabase SQL Editor

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- 3. Enable RLS (admin access only)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 4. Grant permissions to service role
GRANT ALL ON public.system_settings TO service_role;

-- 5. Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. Insert initial polling timestamp
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'last_transfer_poll',
  (NOW() - INTERVAL '1 hour')::text,
  'Last timestamp when transfer polling was executed'
) ON CONFLICT (key) DO NOTHING;