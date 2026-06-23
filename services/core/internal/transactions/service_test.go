package transactions

import "testing"

func TestCreateIntent(t *testing.T) {
	svc := NewService()
	intent, err := svc.CreateIntent("acct-1", "deposit", 5000, "req-1")
	if err != nil {
		t.Fatalf("CreateIntent returned error: %v", err)
	}

	if intent.AccountID != "acct-1" {
		t.Fatalf("expected account id acct-1, got %s", intent.AccountID)
	}

	if intent.Status != "pending" {
		t.Fatalf("expected status pending, got %s", intent.Status)
	}
}
