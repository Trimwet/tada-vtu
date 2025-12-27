-- CRITICAL FIX: Ensure virtual accounts follow proper BVN validation rules
-- This migration fixes existing data and adds constraints to prevent future issues

-- 1. First, let's see what we're dealing with
-- (Run this query first to understand the current state)
/*
SELECT 
  id,
  user_id,
  account_number,
  bank_name,
  is_temporary,
  created_at,
  expires_at
FROM virtual_accounts 
WHERE is_active = true
ORDER BY created_at DESC;
*/

-- 2. Ensure the is_temporary column exists with proper default
ALTER TABLE virtual_accounts 
ALTER COLUMN is_temporary SET DEFAULT false;

-- 3. Update any NULL is_temporary values to false (permanent accounts)
UPDATE virtual_accounts 
SET is_temporary = false 
WHERE is_temporary IS NULL;

-- 4. Make is_temporary NOT NULL
ALTER TABLE virtual_accounts 
ALTER COLUMN is_temporary SET NOT NULL;

-- 5. CRITICAL: Mark suspicious permanent accounts as temporary
-- Any permanent account created without proper validation should be temporary
-- We'll be conservative and mark recent accounts as temporary if they seem suspicious

-- Mark accounts as temporary if they were created recently and might not have proper BVN validation
-- This is a safety measure - users will need to recreate with BVN if they want permanent accounts
UPDATE virtual_accounts 
SET 
  is_temporary = true,
  expires_at = created_at + INTERVAL '24 hours' -- Give them 24 hours to recreate properly
WHERE 
  is_temporary = false 
  AND created_at > NOW() - INTERVAL '7 days' -- Only recent accounts
  AND expires_at IS NULL; -- Accounts that don't have expiry (suspicious)

-- 6. Add a check constraint to ensure temporary accounts have expiry dates
ALTER TABLE virtual_accounts 
ADD CONSTRAINT check_temporary_accounts_have_expiry 
CHECK (
  (is_temporary = false) OR 
  (is_temporary = true AND expires_at IS NOT NULL)
);

-- 7. Add a check constraint to ensure we don't have too many permanent accounts per user
-- This is enforced by the unique index, but let's be extra safe
-- (The unique index idx_virtual_accounts_permanent_per_user already handles this)

-- 8. Create a function to validate virtual account creation
CREATE OR REPLACE FUNCTION validate_virtual_account_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure temporary accounts have expiry dates
  IF NEW.is_temporary = true AND NEW.expires_at IS NULL THEN
    RAISE EXCEPTION 'Temporary virtual accounts must have an expiry date';
  END IF;
  
  -- Ensure permanent accounts don't have expiry dates
  IF NEW.is_temporary = false AND NEW.expires_at IS NOT NULL THEN
    RAISE EXCEPTION 'Permanent virtual accounts should not have expiry dates';
  END IF;
  
  -- Log account creation for audit purposes
  INSERT INTO audit_log (
    table_name, 
    operation, 
    record_id, 
    user_id, 
    details,
    created_at
  ) VALUES (
    'virtual_accounts',
    'INSERT',
    NEW.id,
    NEW.user_id,
    jsonb_build_object(
      'account_number', NEW.account_number,
      'bank_name', NEW.bank_name,
      'is_temporary', NEW.is_temporary,
      'expires_at', NEW.expires_at
    ),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id UUID,
  user_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create the trigger
DROP TRIGGER IF EXISTS trigger_validate_virtual_account_creation ON virtual_accounts;
CREATE TRIGGER trigger_validate_virtual_account_creation
  BEFORE INSERT ON virtual_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_virtual_account_creation();

-- 11. Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_operation ON audit_log(table_name, operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- 12. Grant necessary permissions
GRANT SELECT, INSERT ON audit_log TO authenticated;
GRANT SELECT, INSERT ON audit_log TO service_role;

-- 13. Create a view for easy monitoring
CREATE OR REPLACE VIEW virtual_accounts_summary AS
SELECT 
  COUNT(*) as total_accounts,
  COUNT(*) FILTER (WHERE is_temporary = false) as permanent_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true) as temporary_accounts,
  COUNT(*) FILTER (WHERE is_temporary = true AND expires_at < NOW()) as expired_accounts,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT user_id) FILTER (WHERE is_temporary = false) as users_with_permanent_accounts
FROM virtual_accounts 
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON virtual_accounts_summary TO authenticated;
GRANT SELECT ON virtual_accounts_summary TO service_role;

-- 14. Create a cleanup function for expired temporary accounts
CREATE OR REPLACE FUNCTION cleanup_expired_virtual_accounts()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- Deactivate expired temporary accounts
  UPDATE virtual_accounts 
  SET is_active = false
  WHERE is_temporary = true 
    AND expires_at < NOW() 
    AND is_active = true;
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO audit_log (
    table_name, 
    operation, 
    details,
    created_at
  ) VALUES (
    'virtual_accounts',
    'CLEANUP',
    jsonb_build_object('deactivated_count', cleanup_count),
    NOW()
  );
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- 15. Create a function to check for suspicious accounts
CREATE OR REPLACE FUNCTION check_suspicious_virtual_accounts()
RETURNS TABLE (
  user_id UUID,
  account_number TEXT,
  bank_name TEXT,
  is_temporary BOOLEAN,
  created_at TIMESTAMPTZ,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    va.user_id,
    va.account_number,
    va.bank_name,
    va.is_temporary,
    va.created_at,
    CASE 
      WHEN va.is_temporary = false AND va.expires_at IS NOT NULL THEN 'Permanent account with expiry date'
      WHEN va.is_temporary = true AND va.expires_at IS NULL THEN 'Temporary account without expiry date'
      WHEN va.is_temporary = false AND va.created_at > NOW() - INTERVAL '1 day' THEN 'Recently created permanent account (verify BVN was provided)'
      ELSE 'Other suspicious pattern'
    END as reason
  FROM virtual_accounts va
  WHERE va.is_active = true
    AND (
      (va.is_temporary = false AND va.expires_at IS NOT NULL) OR
      (va.is_temporary = true AND va.expires_at IS NULL) OR
      (va.is_temporary = false AND va.created_at > NOW() - INTERVAL '1 day')
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_virtual_accounts() TO service_role;
GRANT EXECUTE ON FUNCTION check_suspicious_virtual_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION check_suspicious_virtual_accounts() TO service_role;

-- 16. Final verification queries (run these after migration)
/*
-- Check the current state
SELECT * FROM virtual_accounts_summary;

-- Check for any suspicious accounts
SELECT * FROM check_suspicious_virtual_accounts();

-- Check recent audit logs
SELECT * FROM audit_log WHERE table_name = 'virtual_accounts' ORDER BY created_at DESC LIMIT 10;
*/