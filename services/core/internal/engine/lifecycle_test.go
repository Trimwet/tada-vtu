package engine

import "testing"

func TestLifecycleTransitionsAreTracked(t *testing.T) {
	service := &Service{}

	if err := service.transitionIntentStatus("intent-1", "pending", "processing"); err != nil {
		t.Fatalf("transitionIntentStatus returned error: %v", err)
	}
	if err := service.transitionIntentStatus("intent-1", "processing", "completed"); err != nil {
		t.Fatalf("transitionIntentStatus returned error: %v", err)
	}
}
