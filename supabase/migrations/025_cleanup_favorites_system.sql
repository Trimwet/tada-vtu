-- Remove favorites system - keeping TADA VTU clean and focused
-- This migration removes all favorites-related database objects

-- Drop favorites table and related objects
DROP TABLE IF EXISTS public.favorite_data_plans CASCADE;
DROP TABLE IF EXISTS public.vault_qr_codes CASCADE; -- This was created but we'll recreate it without favorites dependency

-- Recreate vault_qr_codes table (clean version)
CREATE TABLE IF NOT EXISTS public.vault_qr_codes (
  id TEXT PRIMARY KEY, -- QR ID from the QR data
  vault_id UUID REFERENCES public.data_vault(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  qr_data JSONB NOT NULL, -- Store the complete QR data
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ, -- When the QR was redeemed
  redeemed_phone TEXT, -- Phone number where data was delivered
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vault_qr_codes_vault_id ON public.vault_qr_codes(vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_qr_codes_user_id ON public.vault_qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_qr_codes_expires_at ON public.vault_qr_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_vault_qr_codes_used_at ON public.vault_qr_codes(used_at);

-- Enable Row Level Security
ALTER TABLE public.vault_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own QR codes" ON public.vault_qr_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own QR codes" ON public.vault_qr_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own QR codes" ON public.vault_qr_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.vault_qr_codes IS 'Tracks QR codes generated for data vault items - personal use only';

-- Log the cleanup
INSERT INTO public.system_settings (key, value, description) 
VALUES (
  'favorites_system_removed', 
  'true', 
  'Favorites system removed to keep TADA VTU clean and focused on core VTU features'
) ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();