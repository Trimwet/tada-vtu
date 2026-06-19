// Package wallet manages wallet state reads and summaries.
//
// Responsibilities:
//   - Read current balance for a user
//   - Wallet history (last N transactions)
//   - Wallet freeze/unfreeze (for fraud holds)
//
// Wallet does NOT write balances directly.
// All writes go through the ledger package.

package wallet
