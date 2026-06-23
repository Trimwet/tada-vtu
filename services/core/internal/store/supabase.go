// Package store provides a lightweight Supabase REST client for the Core service.
//
// All financial writes go through the existing Supabase RPCs (update_user_balance)
// so that Row Level Security and audit triggers defined in the database schema
// remain the single enforcement point for balance integrity.
package store

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Client is a minimal Supabase REST client.
// It uses the service-role key so it bypasses RLS — only call from Core,
// never expose this key to the client side.
type Client struct {
	baseURL string
	apiKey  string
	http    *http.Client
}

// New creates a Supabase client from environment variables.
// Reads SUPABASE_URL (falls back to NEXT_PUBLIC_SUPABASE_URL) and
// SUPABASE_SERVICE_ROLE_KEY.
func New() *Client {
	url := os.Getenv("SUPABASE_URL")
	if url == "" {
		url = os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	}
	return &Client{
		baseURL: url,
		apiKey:  os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		http:    &http.Client{Timeout: 15 * time.Second},
	}
}

// Healthy returns an error if the client is missing required config.
func (c *Client) Healthy() error {
	if c.baseURL == "" {
		return fmt.Errorf("SUPABASE_URL not set")
	}
	if c.apiKey == "" {
		return fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY not set")
	}
	return nil
}

func (c *Client) do(method, path string, body any) ([]byte, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.baseURL+"/rest/v1"+path, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", c.apiKey)
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("supabase %d: %s", resp.StatusCode, string(data))
	}
	return data, nil
}

// ── Read helpers ─────────────────────────────────────────────────────────────

// GetBalance returns the current wallet balance for a user.
func (c *Client) GetBalance(userID string) (float64, error) {
	data, err := c.do("GET", "/profiles?id=eq."+userID+"&select=balance", nil)
	if err != nil {
		return 0, fmt.Errorf("balance query: %w", err)
	}
	var rows []struct {
		Balance float64 `json:"balance"`
	}
	if err := json.Unmarshal(data, &rows); err != nil || len(rows) == 0 {
		return 0, fmt.Errorf("profile not found: %s", userID)
	}
	return rows[0].Balance, nil
}

// TransactionExists checks idempotency by looking up a reference.
func (c *Client) TransactionExists(reference string) (bool, error) {
	data, err := c.do("GET", "/transactions?reference=eq."+reference+"&select=id", nil)
	if err != nil {
		return false, err
	}
	var rows []map[string]any
	if err := json.Unmarshal(data, &rows); err != nil {
		return false, err
	}
	return len(rows) > 0, nil
}

// ── Write helpers ─────────────────────────────────────────────────────────────

// CreditBalance calls the update_user_balance RPC with type=credit.
// This is atomic — the RPC handles the balance update and wallet_transaction
// record in a single database transaction.
func (c *Client) CreditBalance(userID string, amount float64, description, reference string) error {
	return c.callRPC("update_user_balance", map[string]any{
		"p_user_id":     userID,
		"p_amount":      amount,
		"p_type":        "credit",
		"p_description": description,
		"p_reference":   reference,
	})
}

// DebitBalance calls the update_user_balance RPC with type=debit.
func (c *Client) DebitBalance(userID string, amount float64, description, reference string) error {
	return c.callRPC("update_user_balance", map[string]any{
		"p_user_id":     userID,
		"p_amount":      amount,
		"p_type":        "debit",
		"p_description": description,
		"p_reference":   reference,
	})
}

// InsertTransaction writes an immutable transaction record.
func (c *Client) InsertTransaction(record map[string]any) error {
	_, err := c.do("POST", "/transactions", record)
	return err
}

// UpdateTransaction patches a transaction by reference (status, external_reference).
func (c *Client) UpdateTransaction(reference string, patch map[string]any) error {
	_, err := c.do("PATCH", "/transactions?reference=eq."+reference, patch)
	return err
}

// InsertNotification queues a user notification (best-effort, non-fatal).
func (c *Client) InsertNotification(record map[string]any) {
	_, _ = c.do("POST", "/notifications", record)
}

func (c *Client) callRPC(fn string, params map[string]any) error {
	_, err := c.do("POST", "/rpc/"+fn, params)
	return err
}
