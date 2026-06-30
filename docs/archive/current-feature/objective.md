# Feature: Deposit & Withdrawal Flow Hardening

## Goal

Fix four critical security and financial vulnerabilities in the deposit and withdrawal pipeline that are currently causing real money loss and exposing the platform to fraud. The goal is a production-safe money flow where: deposits have a 3-day chargeback hold before funds can be withdrawn, withdrawals are rate-limited and daily-capped at the database level, a Flutterwave payout balance check prevents the debit-then-fail-then-refund trap, and the unauthenticated ghost withdrawal route is permanently deleted.

## Why Now

A code audit (performed 2026-06-29) identified four critical issues and three warnings in the live deposit and withdrawal code. These are not theoretical — they are active risk:

1. `/api/withdrawal/initiate` has no session check and takes `userId` from the request body. It is reachable by anyone who knows or guesses a userId.
2. Deposits are immediately withdrawable. Flutterwave chargebacks arrive 3–7 days later. The current flow allows deposit-with-stolen-card → immediate-withdrawal → chargeback → double loss.
3. Neither withdrawal route imports or calls `checkRateLimit()`. No daily count or amount cap exists anywhere in the code. Users can call `/api/withdrawal/transfer` in a loop.
4. The withdrawal route debits the user's balance, then calls Flutterwave. If Flutterwave fails and `coreRefund()` also fails (network error, timeout), the user's money is stuck with no automatic recovery path.

Additional warnings: PIN hashing uses base64 encoding (not cryptographic hashing), and the in-memory rate limiter resets on every Vercel cold start.

## Current System

- Deposit flow: Flutterwave webhook → `processDeposit()` → `coreDeposit()` → `atomic_deposit()` RPC → balance credited immediately and fully withdrawable.
- Withdrawal flow: Two routes exist — `/api/withdrawal/transfer` (authenticated, max ₦500,000) and `/api/withdrawal/initiate` (NO auth, max ₦50,000, takes userId from body). The authenticated route: PIN verify → `coreDebit()` → `initiateTransfer()` → webhook confirms. No daily limits, no payout balance check, no hold period check.
- PIN hashing: `base64(pin + "tada_salt_2024")` — reversible, not cryptographic.
- Rate limiting: `rate-limiter.ts` exists but is never imported by either withdrawal route.

## Expected Outcome

After this feature:
- Deposited funds cannot be withdrawn for 3 days (hold period tracked in `deposit_holds` table)
- Each user is capped at 3 withdrawals per day and ₦200,000 total per day (enforced by DB query on `withdrawals` table, not in-memory)
- Flutterwave NGN payout balance is checked before `coreDebit()` is called — if it's too low, the request is rejected cleanly before any balance is touched
- `/api/withdrawal/initiate/route.ts` is deleted
- PIN hashing uses bcrypt (backward-compatible — old base64 hashes verified then rehashed on success)
- A cron endpoint `/api/cron/release-deposit-holds` cleans up expired holds daily
