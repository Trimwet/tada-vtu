package reconciliation

import "testing"

func TestRecordCreatesPendingEntry(t *testing.T) {
	svc := NewService()
	entry, err := svc.Record("acct-1", "deposit", 5000, "req-1")
	if err != nil {
		t.Fatalf("Record returned error: %v", err)
	}

	if entry.Status != "pending" {
		t.Fatalf("expected pending status, got %s", entry.Status)
	}
}
