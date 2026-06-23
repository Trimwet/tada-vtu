package ledger

import "testing"

func TestApplyCreditIncreasesBalance(t *testing.T) {
	l := NewLedger()
	if err := l.ApplyCredit("acct-1", 5000, "deposit", "req-1"); err != nil {
		t.Fatalf("ApplyCredit returned error: %v", err)
	}

	balance, err := l.Balance("acct-1")
	if err != nil {
		t.Fatalf("Balance returned error: %v", err)
	}

	if balance != 5000 {
		t.Fatalf("expected balance 5000, got %d", balance)
	}
}

func TestApplyDebitRejectsInsufficientFunds(t *testing.T) {
	l := NewLedger()
	if err := l.ApplyCredit("acct-1", 1000, "deposit", "req-1"); err != nil {
		t.Fatalf("ApplyCredit returned error: %v", err)
	}

	if err := l.ApplyDebit("acct-1", 2000, "purchase", "req-2"); err == nil {
		t.Fatal("expected insufficient funds error")
	}
}

func TestApplyTransferMovesFundsBetweenAccounts(t *testing.T) {
	l := NewLedger()
	if err := l.ApplyCredit("source", 1000, "deposit", "req-1"); err != nil {
		t.Fatalf("ApplyCredit returned error: %v", err)
	}

	if err := l.ApplyTransfer("source", "destination", 400, "transfer", "req-2"); err != nil {
		t.Fatalf("ApplyTransfer returned error: %v", err)
	}

	sourceBalance, err := l.Balance("source")
	if err != nil {
		t.Fatalf("Balance(source) returned error: %v", err)
	}
	destinationBalance, err := l.Balance("destination")
	if err != nil {
		t.Fatalf("Balance(destination) returned error: %v", err)
	}

	if sourceBalance != 600 {
		t.Fatalf("expected source balance 600, got %d", sourceBalance)
	}
	if destinationBalance != 400 {
		t.Fatalf("expected destination balance 400, got %d", destinationBalance)
	}
}
