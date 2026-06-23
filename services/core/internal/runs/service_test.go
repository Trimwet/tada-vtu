package runs

import "testing"

func TestCreateAndExecuteRun(t *testing.T) {
	svc := NewService()
	run, err := svc.CreateRun("intent-1", "acct-1", "deposit", 5000, "mock")
	if err != nil {
		t.Fatalf("CreateRun returned error: %v", err)
	}

	if run.Status != "created" {
		t.Fatalf("expected status created, got %s", run.Status)
	}

	executed, err := svc.Execute(run.ID)
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	if executed.Status != "completed" {
		t.Fatalf("expected status completed, got %s", executed.Status)
	}
}
