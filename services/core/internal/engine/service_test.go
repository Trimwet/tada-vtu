package engine

import (
	"testing"

	"tada-vtu/services/core/internal/ledger"
	"tada-vtu/services/core/internal/providers"
	"tada-vtu/services/core/internal/reconciliation"
	"tada-vtu/services/core/internal/runs"
	"tada-vtu/services/core/internal/transactions"
)

func TestProcessDepositCompletesWorkflow(t *testing.T) {
	l := ledger.NewLedger()
	tx := transactions.NewService()
	runSvc := runs.NewService()
	providerRegistry := providers.NewRegistry()
	reconSvc := reconciliation.NewService(nil)
	svc := NewService(l, tx, runSvc, providerRegistry, reconSvc)

	result, err := svc.ProcessDeposit("acct-1", 5000, "req-1")
	if err != nil {
		t.Fatalf("ProcessDeposit returned error: %v", err)
	}

	if result.Intent.Status != "completed" {
		t.Fatalf("expected intent status completed, got %s", result.Intent.Status)
	}
	if result.Run.Status != "completed" {
		t.Fatalf("expected run status completed, got %s", result.Run.Status)
	}
	if result.Reconciliation.Status != "pending" {
		t.Fatalf("expected reconciliation status pending, got %s", result.Reconciliation.Status)
	}

	balance, err := l.Balance("acct-1")
	if err != nil {
		t.Fatalf("Balance returned error: %v", err)
	}
	if balance != 5000 {
		t.Fatalf("expected balance 5000, got %d", balance)
	}
}

func TestProcessTransferMovesFundsBetweenAccounts(t *testing.T) {
	l := ledger.NewLedger()
	if err := l.ApplyCredit("source", 1000, "deposit", "req-0"); err != nil {
		t.Fatalf("ApplyCredit returned error: %v", err)
	}

	tx := transactions.NewService()
	runSvc := runs.NewService()
	providerRegistry := providers.NewRegistry()
	reconSvc := reconciliation.NewService(nil)
	svc := NewService(l, tx, runSvc, providerRegistry, reconSvc)

	result, err := svc.ProcessTransfer("source", "destination", 400, "req-2")
	if err != nil {
		t.Fatalf("ProcessTransfer returned error: %v", err)
	}

	if result.Intent.Status != "completed" {
		t.Fatalf("expected intent status completed, got %s", result.Intent.Status)
	}

	sourceBalance, _ := l.Balance("source")
	destinationBalance, _ := l.Balance("destination")
	if sourceBalance != 600 {
		t.Fatalf("expected source balance 600, got %d", sourceBalance)
	}
	if destinationBalance != 400 {
		t.Fatalf("expected destination balance 400, got %d", destinationBalance)
	}
}
