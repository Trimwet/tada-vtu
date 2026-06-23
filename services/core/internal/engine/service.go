package engine

import (
	"fmt"
	"time"

	"tada-vtu/services/core/internal/ledger"
	"tada-vtu/services/core/internal/providers"
	"tada-vtu/services/core/internal/reconciliation"
	"tada-vtu/services/core/internal/runs"
	"tada-vtu/services/core/internal/transactions"
)

type Result struct {
	Intent         *transactions.Intent
	Run            *runs.Run
	Reconciliation *reconciliation.Entry
}

type Service struct {
	ledger         *ledger.Ledger
	transactions   *transactions.Service
	runs           *runs.Service
	providers      *providers.Registry
	reconciliation *reconciliation.Service
	intentStates   map[string]string
}

func NewService(l *ledger.Ledger, tx *transactions.Service, runSvc *runs.Service, providerRegistry *providers.Registry, reconSvc *reconciliation.Service) *Service {
	return &Service{
		ledger:         l,
		transactions:   tx,
		runs:           runSvc,
		providers:      providerRegistry,
		reconciliation: reconSvc,
		intentStates:   make(map[string]string),
	}
}

// transitionIntentStatus enforces valid lifecycle transitions.
// Valid path: pending → processing → completed (or failed at any stage).
// Any out-of-order transition is rejected.
func (s *Service) transitionIntentStatus(intentID, fromStatus, toStatus string) error {
	if intentID == "" {
		return fmt.Errorf("intent id is required")
	}
	if fromStatus == "" || toStatus == "" {
		return fmt.Errorf("statuses are required")
	}
	if s.intentStates == nil {
		s.intentStates = make(map[string]string)
	}
	current, ok := s.intentStates[intentID]
	if !ok {
		s.intentStates[intentID] = fromStatus
		current = fromStatus
	}
	if current != fromStatus {
		return fmt.Errorf("invalid transition for %s: expected %s, got %s", intentID, fromStatus, current)
	}
	s.intentStates[intentID] = toStatus
	return nil
}

func (s *Service) ProcessDeposit(accountID string, amount int64, requestID string) (*Result, error) {
	if accountID == "" {
		return nil, fmt.Errorf("account id is required")
	}
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be positive")
	}

	intent, err := s.transactions.CreateIntent(accountID, "deposit", amount, requestID)
	if err != nil {
		return nil, fmt.Errorf("create intent: %w", err)
	}

	if err := s.ledger.ApplyCredit(accountID, amount, "deposit", requestID); err != nil {
		_ = s.transactions.FailIntent(intent.ID)
		return nil, fmt.Errorf("apply credit: %w", err)
	}

	providerResult, err := s.providers.Execute("mock", providers.Request{Kind: "deposit", Amount: amount, AccountID: accountID})
	if err != nil {
		return nil, fmt.Errorf("provider execute: %w", err)
	}

	run, err := s.runs.CreateRun(intent.ID, accountID, "deposit", amount, providerResult.Trace)
	if err != nil {
		return nil, fmt.Errorf("create run: %w", err)
	}
	if _, err := s.runs.Execute(run.ID); err != nil {
		return nil, fmt.Errorf("execute run: %w", err)
	}

	entry, err := s.reconciliation.Record(accountID, "deposit", amount, requestID)
	if err != nil {
		return nil, fmt.Errorf("record reconciliation: %w", err)
	}

	if err := s.transitionIntentStatus(intent.ID, "pending", "processing"); err != nil {
		return nil, err
	}
	if err := s.transitionIntentStatus(intent.ID, "processing", "completed"); err != nil {
		return nil, err
	}

	_ = s.transactions.CompleteIntent(intent.ID)
	intent.Status = "completed"
	intent.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	return &Result{Intent: intent, Run: run, Reconciliation: entry}, nil
}

func (s *Service) ProcessTransfer(fromAccountID, toAccountID string, amount int64, requestID string) (*Result, error) {
	if fromAccountID == "" || toAccountID == "" {
		return nil, fmt.Errorf("account ids are required")
	}
	if fromAccountID == toAccountID {
		return nil, fmt.Errorf("cannot transfer to the same account")
	}
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be positive")
	}

	intent, err := s.transactions.CreateIntent(fromAccountID, "transfer", amount, requestID)
	if err != nil {
		return nil, fmt.Errorf("create intent: %w", err)
	}

	if err := s.ledger.ApplyTransfer(fromAccountID, toAccountID, amount, "transfer", requestID); err != nil {
		_ = s.transactions.FailIntent(intent.ID)
		return nil, fmt.Errorf("apply transfer: %w", err)
	}

	providerResult, err := s.providers.Execute("mock", providers.Request{Kind: "transfer", Amount: amount, AccountID: fromAccountID})
	if err != nil {
		return nil, fmt.Errorf("provider execute: %w", err)
	}

	run, err := s.runs.CreateRun(intent.ID, fromAccountID, "transfer", amount, providerResult.Trace)
	if err != nil {
		return nil, fmt.Errorf("create run: %w", err)
	}
	if _, err := s.runs.Execute(run.ID); err != nil {
		return nil, fmt.Errorf("execute run: %w", err)
	}

	entry, err := s.reconciliation.Record(fromAccountID, "transfer", amount, requestID)
	if err != nil {
		return nil, fmt.Errorf("record reconciliation: %w", err)
	}

	if err := s.transitionIntentStatus(intent.ID, "pending", "processing"); err != nil {
		return nil, err
	}
	if err := s.transitionIntentStatus(intent.ID, "processing", "completed"); err != nil {
		return nil, err
	}

	_ = s.transactions.CompleteIntent(intent.ID)
	intent.Status = "completed"
	intent.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	return &Result{Intent: intent, Run: run, Reconciliation: entry}, nil
}

// ProcessRefund debits the originating account — it models the account paying
// money OUT to fulfill a refund (e.g. merchant account balance decreases when
// they refund a customer). This is intentional: the refund is an outflow from
// the account that initiated it.
//
// For VTU-side user refunds (crediting a user back after failed delivery),
// use the Supabase-backed ledger layer in services/core/internal/ledger/ledger.go
// via the /ledger/refund HTTP endpoint, which calls update_user_balance with
// type=credit. That path is separate from this abstract engine flow.
func (s *Service) ProcessRefund(accountID string, amount int64, requestID string) (*Result, error) {
	if accountID == "" {
		return nil, fmt.Errorf("account id is required")
	}
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be positive")
	}

	intent, err := s.transactions.CreateIntent(accountID, "refund", amount, requestID)
	if err != nil {
		return nil, fmt.Errorf("create intent: %w", err)
	}

	// Debit: the originating account pays out the refund amount.
	if err := s.ledger.ApplyDebit(accountID, amount, "refund", requestID); err != nil {
		_ = s.transactions.FailIntent(intent.ID)
		return nil, fmt.Errorf("apply refund debit: %w", err)
	}

	providerResult, err := s.providers.Execute("mock", providers.Request{Kind: "refund", Amount: amount, AccountID: accountID})
	if err != nil {
		return nil, fmt.Errorf("provider execute: %w", err)
	}

	run, err := s.runs.CreateRun(intent.ID, accountID, "refund", amount, providerResult.Trace)
	if err != nil {
		return nil, fmt.Errorf("create run: %w", err)
	}
	if _, err := s.runs.Execute(run.ID); err != nil {
		return nil, fmt.Errorf("execute run: %w", err)
	}

	entry, err := s.reconciliation.Record(accountID, "refund", amount, requestID)
	if err != nil {
		return nil, fmt.Errorf("record reconciliation: %w", err)
	}

	if err := s.transitionIntentStatus(intent.ID, "pending", "processing"); err != nil {
		return nil, err
	}
	if err := s.transitionIntentStatus(intent.ID, "processing", "completed"); err != nil {
		return nil, err
	}

	_ = s.transactions.CompleteIntent(intent.ID)
	intent.Status = "completed"
	intent.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	return &Result{Intent: intent, Run: run, Reconciliation: entry}, nil
}
