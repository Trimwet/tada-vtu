package providers

import "testing"

func TestRegistryExecutesProvider(t *testing.T) {
	registry := NewRegistry()
	result, err := registry.Execute("mock", Request{Kind: "deposit", Amount: 1000, AccountID: "acct-1"})
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	if result.Status != "accepted" {
		t.Fatalf("expected accepted status, got %s", result.Status)
	}
}
