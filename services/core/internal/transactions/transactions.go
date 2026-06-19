// Package transactions handles transaction recording and idempotency.
//
// Responsibilities:
//   - Create transaction records
//   - Idempotency key enforcement (same reference = same result, no double-process)
//   - Transaction status updates (pending → success / failed)
//   - Reference generation
//
// Every money movement that goes through the ledger
// results in a transaction record here.

package transactions
