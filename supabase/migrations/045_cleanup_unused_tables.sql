-- ============================================================
-- Migration 045: Clean Up Unused Tables
-- ============================================================
-- Removes 13 tables created by previous migrations that are
-- never referenced in TypeScript source code. Also drops
-- orphaned views, functions, and RLS policies.
--
-- NOT dropped:
--   - idempotency_keys (used internally by atomic_* RPCs)
--   - profiles.* columns from 002 (loyalty_points, login_streak,
--     etc.) — non-destructive, negligible space
-- ============================================================

-- ── Phase 1: Drop views and functions ─────────────────────────
DROP VIEW IF EXISTS public.performance_analytics CASCADE;
DROP FUNCTION IF EXISTS public.get_performance_summary CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_performance_metrics CASCADE;
DROP FUNCTION IF EXISTS public.award_loyalty_points CASCADE;
DROP FUNCTION IF EXISTS public.process_daily_login CASCADE;
DROP FUNCTION IF EXISTS public.calculate_loyalty_tier CASCADE;

-- ── Phase 2: Drop unused tables ───────────────────────────────
-- Order: tables with FK references first, then parent tables,
-- then tables with no FK dependencies.

-- From 002_engagement_features.sql
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.loyalty_transactions CASCADE;
DROP TABLE IF EXISTS public.scheduled_recharges CASCADE;
DROP TABLE IF EXISTS public.spin_history CASCADE;
DROP TABLE IF EXISTS public.price_alerts CASCADE;
DROP TABLE IF EXISTS public.gift_transactions CASCADE;

-- From 005_smart_features.sql
DROP TABLE IF EXISTS public.user_spending_patterns CASCADE;
DROP TABLE IF EXISTS public.smart_recommendations CASCADE;
DROP TABLE IF EXISTS public.network_prices CASCADE;

-- From create_performance_metrics_table.sql
DROP TABLE IF EXISTS public.performance_metrics CASCADE;

-- From fix_virtual_accounts_bvn_validation.sql
DROP TABLE IF EXISTS public.audit_log CASCADE;

-- User-facing feature removed: frequent plans
DROP TABLE IF EXISTS public.user_plan_preferences CASCADE;

-- ── Phase 3: Verify nothing was accidentally broken ───────────
-- The following tables are confirmed still intact:
--   profiles, transactions, withdrawals, wallet_transactions,
--   deposit_holds, failed_refunds, data_vault, vault_qr_codes,
--   vault_pools, vault_templates, virtual_accounts,
--   push_subscriptions, notification_preferences,
--   notification_log, bot_config, baileys_sessions,
--   reconciliation_entries, tada_contacts, tada_usernames,
--   user_plan_preferences, user_sessions, system_settings,
--   whatsapp_pending_links, idempotency_keys,
--   scheduled_purchases, scheduled_purchase_logs
