-- Add retry tracking columns to gift_cards
ALTER TABLE gift_cards 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Add index for finding gifts that need retry/support attention
CREATE INDEX IF NOT EXISTS idx_gift_cards_retry 
ON gift_cards (status, retry_count) 
WHERE status = 'opened' AND retry_count > 0;

-- Comment for documentation
COMMENT ON COLUMN gift_cards.retry_count IS 'Number of times recipient attempted to open/claim the gift';
COMMENT ON COLUMN gift_cards.last_error IS 'Last error message from failed claim attempt';
