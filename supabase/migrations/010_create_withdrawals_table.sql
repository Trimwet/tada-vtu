-- Create withdrawals table for tracking bank withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  flw_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  failure_reason TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_reference ON withdrawals(reference);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);

-- RLS policies
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawals
CREATE POLICY "Users can view own withdrawals" ON withdrawals
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update (API handles this)
CREATE POLICY "Service role can manage withdrawals" ON withdrawals
  FOR ALL USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE withdrawals IS 'Bank withdrawal requests and their status';
COMMENT ON COLUMN withdrawals.fee IS 'Platform + Flutterwave fee charged';
COMMENT ON COLUMN withdrawals.net_amount IS 'Amount sent to user bank account';
COMMENT ON COLUMN withdrawals.flw_reference IS 'Flutterwave transfer reference';
