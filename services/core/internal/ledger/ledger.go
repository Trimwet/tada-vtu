package ledger

import (
	"fmt"
	"sync"
)

// Ledger manages in-memory account balances.
// NOTE: This is not persisted to disk. All state is lost on restart.
// Phase 2 work: replace with Supabase-backed persistence.
type Ledger struct {
	mu       sync.RWMutex
	balances map[string]int64
}

func NewLedger() *Ledger {
	return &Ledger{balances: make(map[string]int64)}
}

// ApplyCredit adds amount to an account. Amount must be positive.
func (l *Ledger) ApplyCredit(accountID string, amount int64, kind string, requestID string) error {
	if accountID == "" {
		return fmt.Errorf("account id is required")
	}
	if amount <= 0 {
		return fmt.Errorf("credit amount must be positive, got %d", amount)
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	l.balances[accountID] += amount
	return nil
}

// ApplyDebit subtracts amount from an account. Rejects if balance is insufficient.
func (l *Ledger) ApplyDebit(accountID string, amount int64, kind string, requestID string) error {
	if accountID == "" {
		return fmt.Errorf("account id is required")
	}
	if amount <= 0 {
		return fmt.Errorf("debit amount must be positive, got %d", amount)
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	if l.balances[accountID] < amount {
		return fmt.Errorf("insufficient funds: balance %d, requested %d", l.balances[accountID], amount)
	}
	l.balances[accountID] -= amount
	return nil
}

// ApplyTransfer moves amount from one account to another atomically.
func (l *Ledger) ApplyTransfer(fromAccountID, toAccountID string, amount int64, kind string, requestID string) error {
	if fromAccountID == "" || toAccountID == "" {
		return fmt.Errorf("account ids are required")
	}
	if fromAccountID == toAccountID {
		return fmt.Errorf("cannot transfer to the same account")
	}
	if amount <= 0 {
		return fmt.Errorf("transfer amount must be positive, got %d", amount)
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	if l.balances[fromAccountID] < amount {
		return fmt.Errorf("insufficient funds: balance %d, requested %d", l.balances[fromAccountID], amount)
	}
	l.balances[fromAccountID] -= amount
	l.balances[toAccountID] += amount
	return nil
}

// Balance returns the current balance for an account.
func (l *Ledger) Balance(accountID string) (int64, error) {
	if accountID == "" {
		return 0, fmt.Errorf("account id is required")
	}

	l.mu.RLock()
	defer l.mu.RUnlock()

	return l.balances[accountID], nil
}
