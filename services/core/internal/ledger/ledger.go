// Package ledger is the heart of the TADAPAY financial core.
//
// PRINCIPLE: Ledger is God. All money movement flows through here.
// No system — not Next.js, not WhatsApp, not Eve — can bypass this package.
//
// Responsibilities:
//   - Atomic debit operations
//   - Atomic credit operations
//   - Balance checks before debit (insufficient funds guard)
//   - Idempotency enforcement (duplicate transaction rejection)
//   - Ledger event emission (other systems react to these)
//
// What ledger does NOT do:
//   - It does not call external VTU providers
//   - It does not send notifications
//   - It does not make routing decisions
//
// All operations are atomic. Either the full operation succeeds
// or nothing changes. No partial states.

package ledger
