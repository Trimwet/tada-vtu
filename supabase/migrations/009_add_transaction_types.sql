-- Add 'withdrawal' and 'gift' to transaction type enum
-- Note: PostgreSQL doesn't allow easy enum modification, so we use a workaround

-- First, check if the column uses an enum or text
-- If it's text with a check constraint, we need to modify the constraint
-- If it's an enum, we need to add values

-- Option 1: If using CHECK constraint (most common in Supabase)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'airtime', 'data', 'cable', 'electricity', 'betting', 'withdrawal', 'gift'));

-- Option 2: If using enum type (uncomment if needed)
-- ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'withdrawal';
-- ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'gift';
