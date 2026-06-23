package offline

import "testing"

func TestCreateOfflineEvent(t *testing.T) {
	svc := NewService()
	event, err := svc.CreateEvent("evt-1", "sync")
	if err != nil {
		t.Fatalf("CreateEvent returned error: %v", err)
	}

	if event.Status != "queued" {
		t.Fatalf("expected status queued, got %s", event.Status)
	}
}
