-- Allow refund records in public.transactions.
-- Go Core writes refund rows after failed VTU delivery, so the database
-- constraint must accept the type or the refund path will fail at runtime.

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'airtime', 'data', 'cable', 'electricity', 'betting', 'withdrawal', 'gift', 'refund'));
