-- Gift Cards Enhancements Migration
-- Adds refund tracking, access tokens, and performance indexes

-- 1. Refund tracking columns
ALTER TABLE gift_cards 
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS refund_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);

-- 2. Secure access token for gift links
ALTER TABLE gift_cards 
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;

-- Generate access tokens for existing gifts
UPDATE gift_cards 
SET access_token = encode(gen_random_bytes(16), 'hex')
WHERE access_token IS NULL;

-- Make access_token NOT NULL for new records
ALTER TABLE gift_cards 
ALTER COLUMN access_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_email ON gift_cards(recipient_email);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_expires_at ON gift_cards(expires_at) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_gift_cards_sender_id ON gift_cards(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_access_token ON gift_cards(access_token);
CREATE INDEX IF NOT EXISTS idx_gift_cards_scheduled ON gift_cards(scheduled_delivery) WHERE status = 'scheduled';

-- 4. Comments for documentation
COMMENT ON COLUMN gift_cards.refunded_at IS 'Timestamp when gift was refunded to sender';
COMMENT ON COLUMN gift_cards.refund_transaction_id IS 'Reference to the refund transaction';
COMMENT ON COLUMN gift_cards.access_token IS 'Secure token required to view/open gift';
COMMENT ON COLUMN gift_cards.cancelled_at IS 'Timestamp when gift was cancelled';
COMMENT ON COLUMN gift_cards.cancelled_by IS 'User who cancelled the gift';
