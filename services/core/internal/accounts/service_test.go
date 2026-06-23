package accounts

import "testing"

func TestCreateAccountAndBalance(t *testing.T) {
	svc := NewService()
	account, err := svc.CreateAccount("acct-2")
	if err != nil {
		t.Fatalf("CreateAccount returned error: %v", err)
	}

	if account.ID != "acct-2" {
		t.Fatalf("expected id acct-2, got %s", account.ID)
	}

	balance, err := svc.Balance("acct-2")
	if err != nil {
		t.Fatalf("Balance returned error: %v", err)
	}

	if balance != 0 {
		t.Fatalf("expected balance 0, got %d", balance)
	}
}
