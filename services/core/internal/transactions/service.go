package transactions

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

type Intent struct {
	ID          string `json:"id"`
	AccountID   string `json:"account_id"`
	Action      string `json:"action"`
	Amount      int64  `json:"amount"`
	RequestID   string `json:"request_id"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
	CompletedAt string `json:"completed_at,omitempty"`
	FailedAt    string `json:"failed_at,omitempty"`
	FailReason  string `json:"fail_reason,omitempty"`
}

type Service struct {
	mu      sync.RWMutex
	intents map[string]*Intent
}

func NewService() *Service {
	return &Service{intents: make(map[string]*Intent)}
}

func newID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(b))
}

func (s *Service) CreateIntent(accountID, action string, amount int64, requestID string) (*Intent, error) {
	if accountID == "" {
		return nil, fmt.Errorf("account id is required")
	}
	if action == "" {
		return nil, fmt.Errorf("action is required")
	}
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be positive, got %d", amount)
	}

	// Idempotency: if requestID already seen, return the existing intent
	if requestID != "" {
		s.mu.RLock()
		for _, existing := range s.intents {
			if existing.RequestID == requestID {
				s.mu.RUnlock()
				return existing, nil
			}
		}
		s.mu.RUnlock()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	intent := &Intent{
		ID:        newID("intent"),
		AccountID: accountID,
		Action:    action,
		Amount:    amount,
		RequestID: requestID,
		Status:    "pending",
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	s.intents[intent.ID] = intent
	return intent, nil
}

func (s *Service) GetIntent(id string) (*Intent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	intent, ok := s.intents[id]
	if !ok {
		return nil, fmt.Errorf("intent not found: %s", id)
	}
	return intent, nil
}

func (s *Service) CompleteIntent(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	intent, ok := s.intents[id]
	if !ok {
		return fmt.Errorf("intent not found: %s", id)
	}
	intent.Status = "completed"
	intent.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	return nil
}

func (s *Service) FailIntent(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	intent, ok := s.intents[id]
	if !ok {
		return fmt.Errorf("intent not found: %s", id)
	}
	intent.Status = "failed"
	intent.FailedAt = time.Now().UTC().Format(time.RFC3339)
	return nil
}
