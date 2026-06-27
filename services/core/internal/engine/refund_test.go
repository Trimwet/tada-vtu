package engine

import (
	"testing"

	"tada-vtu/services/core/internal/ledger"
	"tada-vtu/services/core/internal/providers"
	"tada-vtu/services/core/internal/reconciliation"
	"tada-vtu/services/core/internal/runs"
	"tada-vtu/services/core/internal/transactions"
)

func TestProcessRefundCompletesWorkflow(t *testing.T) {
	l := ledger.NewLedger()
	if err := l.ApplyCredit("acct-1", 5000, "deposit", "req-0"); err != nil {
		t.Fatalf("ApplyCredit returned error: %v", err)
	}

	tx := transactions.NewService()
	runSvc := runs.NewService()
	providerRegistry := providers.NewRegistry()
	reconSvc := reconciliation.NewService(nil)
	svc := NewService(l, tx, runSvc, providerRegistry, reconSvc)

	result, err := svc.ProcessRefund("acct-1", 2000, "req-1")
	if err != nil {
		t.Fatalf("ProcessRefund returned error: %v", err)
	}

	if result.Intent.Status != "completed" {
		t.Fatalf("expected intent status completed, got %s", result.Intent.Status)
	}
	if result.Run.Status != "completed" {
		t.Fatalf("expected run status completed, got %s", result.Run.Status)
	}

	balance, err := l.Balance("acct-1")
	if err != nil {
		t.Fatalf("Balance returned error: %v", err)
	}
	if balance != 3000 {
		t.Fatalf("expected balance 3000, got %d", balance)
	}
}
