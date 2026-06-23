package runs

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

type Run struct {
	ID          string `json:"id"`
	IntentID    string `json:"intent_id"`
	AccountID   string `json:"account_id"`
	Action      string `json:"action"`
	Amount      int64  `json:"amount"`
	Provider    string `json:"provider"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
	CompletedAt string `json:"completed_at,omitempty"`
}

type Service struct {
	mu   sync.RWMutex
	runs map[string]*Run
}

func NewService() *Service {
	return &Service{runs: make(map[string]*Run)}
}

func newID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(b))
}

func (s *Service) CreateRun(intentID, accountID, action string, amount int64, provider string) (*Run, error) {
	if intentID == "" {
		return nil, fmt.Errorf("intent id is required")
	}
	if accountID == "" {
		return nil, fmt.Errorf("account id is required")
	}
	if action == "" {
		return nil, fmt.Errorf("action is required")
	}
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be positive, got %d", amount)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	run := &Run{
		ID:        newID("run"),
		IntentID:  intentID,
		AccountID: accountID,
		Action:    action,
		Amount:    amount,
		Provider:  provider,
		Status:    "created",
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	s.runs[run.ID] = run
	return run, nil
}

func (s *Service) Execute(id string) (*Run, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	run, ok := s.runs[id]
	if !ok {
		return nil, fmt.Errorf("run not found: %s", id)
	}

	run.Status = "completed"
	run.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	return run, nil
}

func (s *Service) GetRun(id string) (*Run, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	run, ok := s.runs[id]
	if !ok {
		return nil, fmt.Errorf("run not found: %s", id)
	}
	return run, nil
}
