package offline

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"testing"
	"time"
)

func TestCreateEventRegistersDeviceAndVerifiesSignature(t *testing.T) {
	svc := NewService()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("GenerateKey returned error: %v", err)
	}

	req := sampleRequest("evt-1", "device-1", pub, priv)
	event, err := svc.CreateEvent(req)
	if err != nil {
		t.Fatalf("CreateEvent returned error: %v", err)
	}

	if event.Status != StatusVerified {
		t.Fatalf("expected status verified, got %s", event.Status)
	}
	if event.PublicKeyFingerprint == "" {
		t.Fatal("expected a public key fingerprint")
	}

	stored, err := svc.GetEvent("evt-1")
	if err != nil {
		t.Fatalf("GetEvent returned error: %v", err)
	}
	if stored.DeviceID != "device-1" {
		t.Fatalf("expected device-1, got %s", stored.DeviceID)
	}
}

func TestCreateEventRejectsReplayNonce(t *testing.T) {
	svc := NewService()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("GenerateKey returned error: %v", err)
	}

	first := sampleRequest("evt-1", "device-1", pub, priv)
	if _, err := svc.CreateEvent(first); err != nil {
		t.Fatalf("CreateEvent returned error: %v", err)
	}

	replay := sampleRequest("evt-2", "device-1", pub, priv)
	replay.Nonce = first.Nonce
	replay.Signature = signOfflineEvent(replay, priv)

	if _, err := svc.CreateEvent(replay); err == nil {
		t.Fatal("expected replay error, got nil")
	}
}

func TestCreateEventRejectsInvalidSignature(t *testing.T) {
	svc := NewService()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("GenerateKey returned error: %v", err)
	}

	req := sampleRequest("evt-1", "device-1", pub, priv)
	req.Signature = base64.StdEncoding.EncodeToString([]byte("not-a-valid-signature"))

	if _, err := svc.CreateEvent(req); err == nil {
		t.Fatal("expected invalid signature error, got nil")
	}
}

func TestMarkSynced(t *testing.T) {
	svc := NewService()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("GenerateKey returned error: %v", err)
	}

	req := sampleRequest("evt-1", "device-1", pub, priv)
	if _, err := svc.CreateEvent(req); err != nil {
		t.Fatalf("CreateEvent returned error: %v", err)
	}

	event, err := svc.MarkSynced("evt-1")
	if err != nil {
		t.Fatalf("MarkSynced returned error: %v", err)
	}
	if event.Status != StatusSynced {
		t.Fatalf("expected synced status, got %s", event.Status)
	}
	if event.SyncedAt == "" {
		t.Fatal("expected synced timestamp")
	}
}

func TestCreateEventAcceptsHexEncodedPayload(t *testing.T) {
	svc := NewService()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("GenerateKey returned error: %v", err)
	}

	req := sampleRequest("evt-hex", "device-hex", pub, priv)
	req.PublicKey = hex.EncodeToString(pub)
	req.Signature = hex.EncodeToString(ed25519.Sign(priv, []byte(canonicalMessage(req))))

	if _, err := svc.CreateEvent(req); err != nil {
		t.Fatalf("CreateEvent returned error: %v", err)
	}
}

func sampleRequest(id, deviceID string, pub ed25519.PublicKey, priv ed25519.PrivateKey) CreateEventRequest {
	req := CreateEventRequest{
		ID:        id,
		DeviceID:  deviceID,
		Kind:      "sync",
		Amount:    1500,
		Nonce:     fmt.Sprintf("nonce-%s", id),
		ExpiresAt: time.Now().UTC().Add(1 * time.Hour).Format(time.RFC3339),
		PublicKey: base64.StdEncoding.EncodeToString(pub),
	}
	req.Signature = signOfflineEvent(req, priv)
	return req
}

func signOfflineEvent(req CreateEventRequest, priv ed25519.PrivateKey) string {
	message := canonicalMessage(req)
	signature := ed25519.Sign(priv, []byte(message))
	return base64.StdEncoding.EncodeToString(signature)
}
