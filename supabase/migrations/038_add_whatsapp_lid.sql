-- 038_add_whatsapp_lid.sql
--
-- Adds the whatsapp_lid column to profiles.
--
-- Problem: WhatsApp now sends messages from LIDs (e.g. 62028370673687) rather
-- than real phone numbers in many cases. The bot logs show:
--   [bot] 📩 62028370673687: hi
-- where 62028370673687 is a Linked ID, NOT the user's actual phone number.
--
-- Eve receives this LID as principalId. Tools that call /api/wallet/balance
-- pass it as userId. The balance route already queries:
--   .or("whatsapp_number.eq.${lid},whatsapp_lid.eq.${lid}")
-- But the whatsapp_lid column didn't exist yet, so the query errored silently.
--
-- Fix: add the column and seed the known LID for the test account.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_lid VARCHAR(30) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp_lid
  ON public.profiles (whatsapp_lid)
  WHERE whatsapp_lid IS NOT NULL;

COMMENT ON COLUMN public.profiles.whatsapp_lid IS
  'WhatsApp Linked ID (LID) — numeric JID prefix sent by WhatsApp when '
  'the phone number is not exposed in the JID. Used alongside whatsapp_number '
  'to resolve a WhatsApp sender to a TADAPAY profile.';

-- ── Seed the known test account ──────────────────────────────────────────────
-- LID 62028370673687 belongs to whatsapp_number 2349063546728.
-- Verified from Render logs: [bot] 📩 62028370673687 and profiles table lookup.

UPDATE public.profiles
SET whatsapp_lid = '62028370673687'
WHERE whatsapp_number = '2349063546728';

-- Verify — should return 1 row with both columns populated:
SELECT id, whatsapp_number, whatsapp_lid
FROM public.profiles
WHERE whatsapp_lid = '62028370673687';
