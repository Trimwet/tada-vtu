-- ============================================================
-- Migration 044: Failed Refund Recovery Queue
-- ============================================================
-- Purpose: when a withdrawal fails AND the automatic coreRefund() call
-- also fails, the user's money is debited with no recovery path. This
-- table records that failure so a cron job can retry it, instead of
-- relying solely on a console.error log line.

CREATE TABLE IF NOT EXISTS public.failed_refunds (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount              DECIMAL(12,2) NOT NULL,
  original_reference  TEXT          NOT NULL,
  refund_reference    TEXT          NOT NULL,
  description         TEXT,
  source              TEXT          NOT NULL DEFAULT 'withdrawal', -- withdrawal | webhook
  attempts            INT           NOT NULL DEFAULT 1,
  last_error          TEXT,
  resolved            BOOLEAN       NOT NULL DEFAULT false,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_failed_refunds_original_ref
  ON public.failed_refunds (original_reference)
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_failed_refunds_unresolved
  ON public.failed_refunds (resolved, created_at)
  WHERE resolved = false;

ALTER TABLE public.failed_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages failed refunds" ON public.failed_refunds
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.failed_refunds IS
  'Tracks withdrawals where both the original transfer AND the automatic refund failed, leaving a user debited with no money returned. Retried by the retry-failed-refunds cron. Resolved manually or automatically once coreRefund succeeds.';
