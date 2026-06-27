-- Migration 033: Add whatsapp_session_token to profiles
-- Stores the Eve agent conversation continuation token per user so the
-- WhatsApp integration can maintain persistent conversation memory.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_session_token TEXT;
