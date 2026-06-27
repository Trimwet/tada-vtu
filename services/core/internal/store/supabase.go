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
	"regexp"
	"strings"
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
	return c.request(method, path, body, "return=minimal")
}

// doRPC calls a Postgres function via PostgREST and returns its JSON result
// body verbatim. Unlike do(), this does NOT send "Prefer: return=minimal" —
// that header causes PostgREST to drop the response body, which would lose
// the JSONB payload that atomic_debit/atomic_refund return.
func (c *Client) doRPC(fn string, params map[string]any) ([]byte, error) {
	return c.request("POST", "/rpc/"+fn, params, "")
}

// request is the shared low-level HTTP helper. prefer is sent as the
// "Prefer" header when non-empty; pass "" to get the default representation
// (needed for RPC calls whose return value we must read).
func (c *Client) request(method, path string, body any, prefer string) ([]byte, error) {
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
	if prefer != "" {
		req.Header.Set("Prefer", prefer)
	}

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

// ── Atomic, idempotent debit/refund (migration 035) ─────────────────────────
//
// These call the atomic_debit / atomic_refund Postgres functions, which run
// the idempotency check, balance lock, balance check, balance update, and
// transaction-row insert all inside ONE database transaction. This closes
// the race that existed when those steps were separate HTTP round-trips
// (TransactionExists → GetBalance → DebitBalance → InsertTransaction):
// under the old flow, two concurrent requests with the same reference could
// both pass the idempotency check before either had written a row, causing
// a double debit. The SQL function makes that impossible.

var atomicInsufficientBalanceRe = regexp.MustCompile(`balance=([\d.]+)\s+requested=([\d.]+)`)

// parseAtomicError translates the Postgres exception text raised by
// atomic_debit/atomic_refund (e.g. "INSUFFICIENT_BALANCE: balance=100.00
// requested=500.00") into the same error wording the old check-then-act
// code produced ("insufficient funds: balance 100.00, requested 500.00"),
// so callers in vtu/handlers.go and the Next.js layer that pattern-match on
// error text keep working unchanged.
func parseAtomicError(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	if strings.Contains(msg, "INSUFFICIENT_BALANCE") {
		if m := atomicInsufficientBalanceRe.FindStringSubmatch(msg); len(m) == 3 {
			return fmt.Errorf("insufficient funds: balance %s, requested %s", m[1], m[2])
		}
		return fmt.Errorf("insufficient funds")
	}
	if strings.Contains(msg, "USER_NOT_FOUND") {
		return fmt.Errorf("profile not found")
	}
	return err
}

// AtomicDebitResult mirrors the JSONB shape returned by atomic_debit().
type AtomicDebitResult struct {
	Success       bool    `json:"success"`
	NewBalance    float64 `json:"newBalance"`
	AmountDebited float64 `json:"amountDebited"`
}

// AtomicDebit performs an idempotent, race-free debit. idempotencyKey is the
// key used for replay detection — pass a value that stays stable across
// client retries of the *same* logical purchase attempt; if the caller has
// no such key, fall back to reference (which still protects against two
// concurrent requests carrying the exact same reference, but not against a
// caller that mints a fresh reference on every retry).
func (c *Client) AtomicDebit(idempotencyKey, userID string, amount float64, description, reference, serviceType string, metadata map[string]any) (*AtomicDebitResult, error) {
	if metadata == nil {
		metadata = map[string]any{}
	}
	data, err := c.doRPC("atomic_debit", map[string]any{
		"p_idempotency_key": idempotencyKey,
		"p_user_id":         userID,
		"p_amount":          amount,
		"p_description":     description,
		"p_reference":       reference,
		"p_service_type":    serviceType,
		"p_metadata":        metadata,
	})
	if err != nil {
		return nil, parseAtomicError(err)
	}
	var result AtomicDebitResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("atomic_debit: failed to parse response %q: %w", string(data), err)
	}
	return &result, nil
}

// AtomicRefundResult mirrors the JSONB shape returned by atomic_refund().
type AtomicRefundResult struct {
	Success    bool    `json:"success"`
	NewBalance float64 `json:"newBalance"`
}

// AtomicRefund performs an idempotent refund credit, marks the original
// transaction failed, and inserts the refund record — all inside one DB
// transaction (see migration 035, atomic_refund()).
func (c *Client) AtomicRefund(idempotencyKey, userID string, amount float64, description, reference, originalReference string) (*AtomicRefundResult, error) {
	data, err := c.doRPC("atomic_refund", map[string]any{
		"p_idempotency_key":    idempotencyKey,
		"p_user_id":            userID,
		"p_amount":             amount,
		"p_description":        description,
		"p_reference":          reference,
		"p_original_reference": originalReference,
	})
	if err != nil {
		return nil, parseAtomicError(err)
	}
	var result AtomicRefundResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("atomic_refund: failed to parse response %q: %w", string(data), err)
	}
	return &result, nil
}

// AtomicDepositResult mirrors the JSONB shape returned by atomic_deposit().
type AtomicDepositResult struct {
	Success          bool    `json:"success"`
	NewBalance       float64 `json:"newBalance"`
	AlreadyProcessed bool    `json:"alreadyProcessed"`
}

// AtomicDeposit credits a user's wallet in a single Postgres transaction:
// idempotency lookup → FOR UPDATE balance lock → credit → wallet_transactions
// audit row → transactions record → idempotency cache. This replaces the
// previous three-step flow (TransactionExists → CreditBalance →
// InsertTransaction) which had the same TOCTOU race as the old debit path.
//
// idempotencyKey should be the payment provider's stable reference
// (externalReference / flw_ref) — it is guaranteed unique per payment event
// and does not change between retry deliveries of the same webhook.
func (c *Client) AtomicDeposit(
	idempotencyKey, userID string,
	amount float64,
	description, reference, externalReference, paymentType string,
	grossAmount, fee float64,
	metadata map[string]any,
) (*AtomicDepositResult, error) {
	if metadata == nil {
		metadata = map[string]any{}
	}
	data, err := c.doRPC("atomic_deposit", map[string]any{
		"p_idempotency_key":    idempotencyKey,
		"p_user_id":            userID,
		"p_amount":             amount,
		"p_description":        description,
		"p_reference":          reference,
		"p_external_reference": externalReference,
		"p_payment_type":       paymentType,
		"p_gross_amount":       grossAmount,
		"p_fee":                fee,
		"p_metadata":           metadata,
	})
	if err != nil {
		return nil, parseAtomicError(err)
	}
	var result AtomicDepositResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("atomic_deposit: failed to parse response %q: %w", string(data), err)
	}
	return &result, nil
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

// InsertReconciliationEntry persists a new reconciliation entry with status "pending".
func (c *Client) InsertReconciliationEntry(record map[string]any) error {
	_, err := c.do("POST", "/reconciliation_entries", record)
	return err
}

// UpdateReconciliationEntry patches the status of a reconciliation entry by its ID.
func (c *Client) UpdateReconciliationEntry(id string, status string) error {
	_, err := c.do("PATCH", "/reconciliation_entries?id=eq."+id, map[string]any{
		"status":     status,
		"updated_at": "now()",
	})
	return err
}

func (c *Client) callRPC(fn string, params map[string]any) error {
	_, err := c.do("POST", "/rpc/"+fn, params)
	return err
}
