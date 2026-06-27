package reconciliation

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// Store is a write-only interface for persisting reconciliation entries.
// Passing nil disables persistence (useful in tests and the in-memory simulation).
type Store interface {
	InsertReconciliationEntry(record map[string]any) error
	UpdateReconciliationEntry(id string, status string) error
}

type Entry struct {
	ID        string `json:"id"`
	AccountID string `json:"account_id"`
	Kind      string `json:"kind"`
	Amount    int64  `json:"amount"`
	RequestID string `json:"request_id"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type Service struct {
	mu      sync.RWMutex
	entries map[string]*Entry
	store   Store
}

// NewService creates a reconciliation service.
// Pass a non-nil Store to enable Supabase persistence; pass nil for in-memory only.
func NewService(store Store) *Service {
	return &Service{
		entries: make(map[string]*Entry),
		store:   store,
	}
}

func newID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(b))
}

// Record creates a reconciliation entry with status "pending".
// Entries are resolved asynchronously by the reconciliation worker
// once the provider confirms the transaction externally.
func (s *Service) Record(accountID, kind string, amount int64, requestID string) (*Entry, error) {
	if accountID == "" {
		return nil, fmt.Errorf("account id is required")
	}
	if kind == "" {
		return nil, fmt.Errorf("kind is required")
	}
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be positive, got %d", amount)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	entry := &Entry{
		ID:        newID("recon"),
		AccountID: accountID,
		Kind:      kind,
		Amount:    amount,
		RequestID: requestID,
		Status:    "pending",
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	s.entries[entry.ID] = entry

	// Persist to Supabase if a store was provided.
	if s.store != nil {
		if err := s.store.InsertReconciliationEntry(map[string]any{
			"id":         entry.ID,
			"account_id": entry.AccountID,
			"kind":       entry.Kind,
			"amount":     entry.Amount,
			"request_id": entry.RequestID,
			"status":     entry.Status,
		}); err != nil {
			// Non-fatal: the in-memory record is already written; log and continue.
			fmt.Printf("[reconciliation] warn: failed to persist entry %s: %v\n", entry.ID, err)
		}
	}

	return entry, nil
}

// Resolve marks an entry as reconciled after external confirmation.
func (s *Service) Resolve(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.entries[id]
	if !ok {
		return fmt.Errorf("entry not found: %s", id)
	}
	entry.Status = "reconciled"

	// Sync resolved status to Supabase.
	if s.store != nil {
		if err := s.store.UpdateReconciliationEntry(id, "reconciled"); err != nil {
			fmt.Printf("[reconciliation] warn: failed to update entry %s: %v\n", id, err)
		}
	}

	return nil
}

func (s *Service) GetEntry(id string) (*Entry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entry, ok := s.entries[id]
	if !ok {
		return nil, fmt.Errorf("entry not found: %s", id)
	}
	return entry, nil
}
