-- Migration 034: Create reconciliation_entries table
-- Stores reconciliation entries written by Go Core and consumed by the
-- Next.js reconcile cron worker.
CREATE TABLE IF NOT EXISTS reconciliation_entries (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  kind VARCHAR(50) NOT NULL,
  amount BIGINT NOT NULL,
  request_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_entries_status ON reconciliation_entries(status);
