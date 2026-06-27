package offline

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"
)

var (
	ErrInvalidRequest   = errors.New("invalid offline event request")
	ErrUnknownDevice    = errors.New("device not registered")
	ErrDuplicateEvent   = errors.New("event already exists")
	ErrReplayDetected   = errors.New("nonce already used")
	ErrExpired          = errors.New("offline event expired")
	ErrInvalidSignature = errors.New("invalid signature")
	ErrDeviceMismatch   = errors.New("device key mismatch")
	ErrEventNotFound    = errors.New("event not found")
)

type Status string

const (
	StatusQueued   Status = "queued"
	StatusVerified Status = "verified"
	StatusSynced   Status = "synced"
	StatusRejected Status = "rejected"
)

type Device struct {
	ID          string `json:"id"`
	PublicKey   string `json:"public_key"`
	Fingerprint string `json:"fingerprint"`
	CreatedAt   string `json:"created_at"`
	LastSeenAt  string `json:"last_seen_at"`
}

type Event struct {
	ID                   string `json:"id"`
	DeviceID             string `json:"device_id"`
	Kind                 string `json:"kind"`
	Amount               int64  `json:"amount"`
	Nonce                string `json:"nonce"`
	ExpiresAt            string `json:"expires_at,omitempty"`
	Signature            string `json:"signature"`
	PublicKeyFingerprint string `json:"public_key_fingerprint"`
	Status               Status `json:"status"`
	CreatedAt            string `json:"created_at"`
	VerifiedAt           string `json:"verified_at,omitempty"`
	SyncedAt             string `json:"synced_at,omitempty"`
	FailureReason        string `json:"failure_reason,omitempty"`
}

type CreateEventRequest struct {
	ID        string `json:"id"`
	DeviceID  string `json:"device_id"`
	Kind      string `json:"kind"`
	Amount    int64  `json:"amount"`
	Nonce     string `json:"nonce"`
	ExpiresAt string `json:"expires_at,omitempty"`
	Signature string `json:"signature"`
	PublicKey string `json:"public_key,omitempty"`
}

type Service struct {
	mu         sync.Mutex
	events     map[string]*Event
	devices    map[string]*Device
	seenNonces map[string]map[string]struct{}
}

func NewService() *Service {
	return &Service{
		events:     make(map[string]*Event),
		devices:    make(map[string]*Device),
		seenNonces: make(map[string]map[string]struct{}),
	}
}

func (s *Service) RegisterDevice(deviceID string, publicKey ed25519.PublicKey) (*Device, error) {
	if deviceID == "" {
		return nil, fmt.Errorf("%w: device_id is required", ErrInvalidRequest)
	}
	if len(publicKey) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("%w: public key is invalid", ErrInvalidRequest)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.devices[deviceID]; ok {
		if !bytes.Equal(existing.PublicKeyBytes(), publicKey) {
			return nil, ErrDeviceMismatch
		}
		existing.LastSeenAt = time.Now().UTC().Format(time.RFC3339)
		return cloneDevice(existing), nil
	}

	return cloneDevice(s.registerDeviceLocked(deviceID, publicKey)), nil
}

func (s *Service) CreateEvent(req CreateEventRequest) (*Event, error) {
	if req.ID == "" || req.DeviceID == "" || req.Kind == "" || req.Nonce == "" || req.Signature == "" {
		return nil, fmt.Errorf("%w: id, device_id, kind, nonce, and signature are required", ErrInvalidRequest)
	}
	if req.Amount <= 0 {
		return nil, fmt.Errorf("%w: amount must be positive", ErrInvalidRequest)
	}

	publicKey, err := decodePublicKey(req.PublicKey)
	if err != nil {
		return nil, err
	}
	signature, err := decodeSignature(req.Signature)
	if err != nil {
		return nil, err
	}

	if req.ExpiresAt != "" {
		expiresAt, err := time.Parse(time.RFC3339, req.ExpiresAt)
		if err != nil {
			return nil, fmt.Errorf("%w: expires_at must be RFC3339", ErrInvalidRequest)
		}
		if time.Now().UTC().After(expiresAt.UTC()) {
			return nil, ErrExpired
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	device, ok := s.devices[req.DeviceID]
	var devicePublicKey ed25519.PublicKey
	if !ok {
		if len(publicKey) == 0 {
			return nil, fmt.Errorf("%w: %s", ErrUnknownDevice, req.DeviceID)
		}
		devicePublicKey = publicKey
	} else {
		devicePublicKey = device.PublicKeyBytes()
		if len(devicePublicKey) != ed25519.PublicKeySize {
			return nil, fmt.Errorf("%w: stored key is invalid", ErrInvalidRequest)
		}
		if len(publicKey) > 0 && !bytes.Equal(devicePublicKey, publicKey) {
			return nil, ErrDeviceMismatch
		}
	}

	if _, ok := s.events[req.ID]; ok {
		return nil, fmt.Errorf("%w: %s", ErrDuplicateEvent, req.ID)
	}
	if s.nonceSeenLocked(req.DeviceID, req.Nonce) {
		return nil, fmt.Errorf("%w: %s", ErrReplayDetected, req.Nonce)
	}

	message := canonicalMessage(req)
	if !ed25519.Verify(devicePublicKey, []byte(message), signature) {
		return nil, ErrInvalidSignature
	}

	if !ok {
		device = s.registerDeviceLocked(req.DeviceID, devicePublicKey)
	} else {
		device.LastSeenAt = time.Now().UTC().Format(time.RFC3339)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	event := &Event{
		ID:                   req.ID,
		DeviceID:             req.DeviceID,
		Kind:                 req.Kind,
		Amount:               req.Amount,
		Nonce:                req.Nonce,
		ExpiresAt:            req.ExpiresAt,
		Signature:            req.Signature,
		PublicKeyFingerprint: device.Fingerprint,
		Status:               StatusVerified,
		CreatedAt:            now,
		VerifiedAt:           now,
	}

	s.events[event.ID] = event
	s.markNonceSeenLocked(req.DeviceID, req.Nonce)

	return cloneEvent(event), nil
}

func (s *Service) MarkSynced(eventID string) (*Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	event, ok := s.events[eventID]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrEventNotFound, eventID)
	}

	event.Status = StatusSynced
	event.SyncedAt = time.Now().UTC().Format(time.RFC3339)
	return cloneEvent(event), nil
}

func (s *Service) GetEvent(eventID string) (*Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	event, ok := s.events[eventID]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrEventNotFound, eventID)
	}

	return cloneEvent(event), nil
}

func (s *Service) ListEvents() []*Event {
	s.mu.Lock()
	defer s.mu.Unlock()

	events := make([]*Event, 0, len(s.events))
	for _, event := range s.events {
		events = append(events, cloneEvent(event))
	}
	return events
}

func (s *Service) registerDeviceLocked(deviceID string, publicKey ed25519.PublicKey) *Device {
	fingerprint := fingerprintPublicKey(publicKey)
	now := time.Now().UTC().Format(time.RFC3339)

	device := &Device{
		ID:          deviceID,
		PublicKey:   base64.StdEncoding.EncodeToString(publicKey),
		Fingerprint: fingerprint,
		CreatedAt:   now,
		LastSeenAt:  now,
	}
	s.devices[deviceID] = device
	return device
}

func (s *Service) nonceSeenLocked(deviceID, nonce string) bool {
	used, ok := s.seenNonces[deviceID]
	if !ok {
		return false
	}
	_, seen := used[nonce]
	return seen
}

func (s *Service) markNonceSeenLocked(deviceID, nonce string) {
	used, ok := s.seenNonces[deviceID]
	if !ok {
		used = make(map[string]struct{})
		s.seenNonces[deviceID] = used
	}
	used[nonce] = struct{}{}
}

func decodePublicKey(encoded string) (ed25519.PublicKey, error) {
	if encoded == "" {
		return nil, nil
	}

	raw, err := decodeFlexibleBytes(encoded)
	if err != nil {
		return nil, fmt.Errorf("%w: public key must be base64 or hex", ErrInvalidRequest)
	}
	if len(raw) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("%w: public key must be %d bytes", ErrInvalidRequest, ed25519.PublicKeySize)
	}

	return ed25519.PublicKey(raw), nil
}

func decodeSignature(encoded string) ([]byte, error) {
	raw, err := decodeFlexibleBytes(encoded)
	if err != nil {
		return nil, fmt.Errorf("%w: signature must be base64 or hex", ErrInvalidRequest)
	}
	if len(raw) != ed25519.SignatureSize {
		return nil, fmt.Errorf("%w: signature must be %d bytes", ErrInvalidRequest, ed25519.SignatureSize)
	}
	return raw, nil
}

func decodeFlexibleBytes(encoded string) ([]byte, error) {
	if isLikelyHex(encoded) {
		if raw, err := hex.DecodeString(encoded); err == nil {
			return raw, nil
		}
	}
	if raw, err := base64.StdEncoding.DecodeString(encoded); err == nil {
		return raw, nil
	}
	if raw, err := hex.DecodeString(encoded); err == nil {
		return raw, nil
	}
	return nil, fmt.Errorf("invalid encoding")
}

func isLikelyHex(value string) bool {
	if len(value)%2 != 0 || value == "" {
		return false
	}
	for _, r := range value {
		switch {
		case r >= '0' && r <= '9':
		case r >= 'a' && r <= 'f':
		case r >= 'A' && r <= 'F':
		default:
			return false
		}
	}
	return true
}

func canonicalMessage(req CreateEventRequest) string {
	return fmt.Sprintf("%s|%s|%s|%d|%s|%s", req.ID, req.DeviceID, req.Kind, req.Amount, req.Nonce, req.ExpiresAt)
}

func fingerprintPublicKey(publicKey ed25519.PublicKey) string {
	sum := sha256.Sum256(publicKey)
	return hex.EncodeToString(sum[:8])
}

func cloneEvent(event *Event) *Event {
	if event == nil {
		return nil
	}
	copy := *event
	return &copy
}

func cloneDevice(device *Device) *Device {
	if device == nil {
		return nil
	}
	copy := *device
	return &copy
}

func (d *Device) PublicKeyBytes() ed25519.PublicKey {
	if d == nil || d.PublicKey == "" {
		return nil
	}

	raw, err := base64.StdEncoding.DecodeString(d.PublicKey)
	if err != nil {
		return nil
	}
	return ed25519.PublicKey(raw)
}
