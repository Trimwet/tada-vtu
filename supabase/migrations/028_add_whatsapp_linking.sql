-- Migration: Add WhatsApp Linking Support
-- Enables Smart Identification for Google signup users and WhatsApp integration

-- Add dedicated WhatsApp number field (separate from phone_number)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(15) UNIQUE,
ADD COLUMN IF NOT EXISTS whatsapp_linked_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp_number ON profiles(whatsapp_number);

-- Create pending WhatsApp links table
CREATE TABLE IF NOT EXISTS whatsapp_pending_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number VARCHAR(15) UNIQUE NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP
);

-- Create index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_pending_code ON whatsapp_pending_links(verification_code);
CREATE INDEX IF NOT EXISTS idx_whatsapp_pending_expires ON whatsapp_pending_links(expires_at);

-- Add comment
COMMENT ON TABLE whatsapp_pending_links IS 'Stores pending WhatsApp number verification links for Smart Identification';
COMMENT ON COLUMN profiles.whatsapp_number IS 'Dedicated WhatsApp number field for OpenClaw integration';
