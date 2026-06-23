package merchant

import "testing"

func TestCreateMerchant(t *testing.T) {
	svc := NewService()
	merchant, err := svc.CreateMerchant("m-1", "Test Merchant")
	if err != nil {
		t.Fatalf("CreateMerchant returned error: %v", err)
	}

	if merchant.Name != "Test Merchant" {
		t.Fatalf("expected merchant name Test Merchant, got %s", merchant.Name)
	}
}
