// Package ledger is the financial heart of TADAPAY.
// All money movement flows through here. Nothing bypasses this.

package ledger

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// ─── Supabase client ─────────────────────────────────────────────────────────

type supabaseClient struct {
	baseURL string
	apiKey  string
	http    *http.Client
}

func newClient() *supabaseClient {
	url := os.Getenv("SUPABASE_URL")
	if url == "" {
		url = os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	}
	return &supabaseClient{
		baseURL: url,
		apiKey:  os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		http:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *supabaseClient) do(method, path string, body any) ([]byte, error) {
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

func (c *supabaseClient) transactionExists(externalRef string) (bool, error) {
	data, err := c.do("GET", "/transactions?external_reference=eq."+externalRef+"&select=id", nil)
	if err != nil {
		return false, err
	}
	var rows []map[string]any
	if err := json.Unmarshal(data, &rows); err != nil {
		return false, err
	}
	return len(rows) > 0, nil
}

func (c *supabaseClient) getBalance(userID string) (float64, error) {
	data, err := c.do("GET", "/profiles?id=eq."+userID+"&select=balance", nil)
	if err != nil {
		return 0, err
	}
	var rows []struct {
		Balance float64 `json:"balance"`
	}
	if err := json.Unmarshal(data, &rows); err != nil || len(rows) == 0 {
		return 0, fmt.Errorf("profile not found for user: %s", userID)
	}
	return rows[0].Balance, nil
}

func (c *supabaseClient) callRPC(fn string, params map[string]any) error {
	_, err := c.do("POST", "/rpc/"+fn, params)
	return err
}

func (c *supabaseClient) insert(table string, record map[string]any) error {
	_, err := c.do("POST", "/"+table, record)
	return err
}

// ─── Deposit ─────────────────────────────────────────────────────────────────

type DepositRequest struct {
	UserID            string         `json:"userId"`
	Amount            float64        `json:"amount"`
	WalletCredit      float64        `json:"walletCredit"`
	Fee               float64        `json:"fee"`
	Reference         string         `json:"reference"`
	ExternalReference string         `json:"externalReference"`
	PaymentType       string         `json:"paymentType"`
	Description       string         `json:"description"`
	Metadata          map[string]any `json:"metadata"`
}

type DepositResult struct {
	Success          bool    `json:"success"`
	NewBalance       float64 `json:"newBalance,omitempty"`
	AlreadyProcessed bool    `json:"alreadyProcessed,omitempty"`
}

func ProcessDeposit(req DepositRequest) (*DepositResult, error) {
	db := newClient()

	log.Printf("[LEDGER] Deposit start: user=%s ref=%s gross=%.2f credit=%.2f",
		req.UserID, req.Reference, req.Amount, req.WalletCredit)

	exists, err := db.transactionExists(req.ExternalReference)
	if err != nil {
		return nil, fmt.Errorf("idempotency check failed: %w", err)
	}
	if exists {
		log.Printf("[LEDGER] Duplicate rejected: %s", req.ExternalReference)
		return &DepositResult{Success: true, AlreadyProcessed: true}, nil
	}

	if err := db.callRPC("update_user_balance", map[string]any{
		"p_user_id":     req.UserID,
		"p_amount":      req.WalletCredit,
		"p_type":        "credit",
		"p_description": req.Description,
		"p_reference":   req.Reference,
	}); err != nil {
		return nil, fmt.Errorf("balance RPC failed: %w", err)
	}

	if err := db.insert("transactions", map[string]any{
		"user_id":            req.UserID,
		"type":               "deposit",
		"amount":             req.WalletCredit,
		"status":             "success",
		"description":        req.Description,
		"reference":          req.Reference,
		"external_reference": req.ExternalReference,
		"response_data": map[string]any{
			"payment_type": req.PaymentType,
			"gross_amount": req.Amount,
			"fee_deducted": req.Fee,
			"source":       "tada-core",
		},
	}); err != nil {
		return nil, fmt.Errorf("transaction insert failed: %w", err)
	}

	_ = db.insert("notifications", map[string]any{
		"user_id": req.UserID,
		"type":    "success",
		"title":   "Wallet Funded! 💰",
		"message": fmt.Sprintf("₦%.0f has been added to your wallet.", req.WalletCredit),
	})

	newBalance, err := db.getBalance(req.UserID)
	if err != nil {
		log.Printf("[LEDGER] Warning: deposit succeeded but balance read failed: %v", err)
	}

	log.Printf("[LEDGER] Deposit complete: user=%s new_balance=%.2f", req.UserID, newBalance)
	return &DepositResult{Success: true, NewBalance: newBalance}, nil
}

// ─── Debit ────────────────────────────────────────────────────────────────────

// DebitRequest is what Next.js sends to POST /ledger/debit.
// Used for every VTU purchase: airtime, data, cable, electricity, etc.
type DebitRequest struct {
	UserID      string         `json:"userId"`
	Amount      float64        `json:"amount"`      // amount to deduct from wallet
	Reference   string         `json:"reference"`   // internal reference (e.g. TADA_DATA_001)
	ServiceType string         `json:"serviceType"` // "airtime" | "data" | "cable" | "electricity"
	Description string         `json:"description"`
	Metadata    map[string]any `json:"metadata"`
}

// DebitResult is what Core returns to Next.js after a debit.
type DebitResult struct {
	Success     bool    `json:"success"`
	NewBalance  float64 `json:"newBalance"`
	AmountDebited float64 `json:"amountDebited"`
}

// ProcessDebit deducts from a user's wallet for a VTU purchase.
// Execution order:
//  1. Idempotency check  — never debit the same reference twice
//  2. Balance check      — reject if insufficient funds (no overdraft)
//  3. Atomic RPC debit   — update_user_balance with type=debit
//  4. Transaction record — immutable log entry with status=pending
//     (status updated to success/failed by the VTU provider layer after delivery)
//  5. Return new balance
func ProcessDebit(req DebitRequest) (*DebitResult, error) {
	db := newClient()

	log.Printf("[LEDGER] Debit start: user=%s ref=%s amount=%.2f service=%s",
		req.UserID, req.Reference, req.Amount, req.ServiceType)

	// 1. Idempotency — never debit the same reference twice
	exists, err := db.transactionExists(req.Reference)
	if err != nil {
		return nil, fmt.Errorf("idempotency check failed: %w", err)
	}
	if exists {
		log.Printf("[LEDGER] Debit duplicate rejected: %s", req.Reference)
		// Return the current balance — the caller already processed this.
		balance, _ := db.getBalance(req.UserID)
		return &DebitResult{Success: true, NewBalance: balance, AmountDebited: req.Amount}, nil
	}

	// 2. Balance check — Core enforces no overdraft
	currentBalance, err := db.getBalance(req.UserID)
	if err != nil {
		return nil, fmt.Errorf("balance check failed: %w", err)
	}
	if currentBalance < req.Amount {
		log.Printf("[LEDGER] Insufficient funds: user=%s balance=%.2f requested=%.2f",
			req.UserID, currentBalance, req.Amount)
		return nil, fmt.Errorf("insufficient funds: balance %.2f, requested %.2f",
			currentBalance, req.Amount)
	}

	// 3. Atomic debit via the existing Supabase RPC
	if err := db.callRPC("update_user_balance", map[string]any{
		"p_user_id":     req.UserID,
		"p_amount":      req.Amount,
		"p_type":        "debit",
		"p_description": req.Description,
		"p_reference":   req.Reference,
	}); err != nil {
		return nil, fmt.Errorf("balance RPC failed: %w", err)
	}

	// 4. Immutable transaction record — status=pending until provider confirms delivery
	if err := db.insert("transactions", map[string]any{
		"user_id":            req.UserID,
		"type":               req.ServiceType,
		"amount":             req.Amount,
		"status":             "pending",
		"description":        req.Description,
		"reference":          req.Reference,
		"external_reference": req.Reference, // overwritten by provider layer on delivery
		"response_data": map[string]any{
			"service_type": req.ServiceType,
			"source":       "tada-core",
			"metadata":     req.Metadata,
		},
	}); err != nil {
		// CRITICAL: balance was already debited. Log this loudly but don't fail —
		// the money has moved. The transaction record will be reconciled.
		log.Printf("[LEDGER] CRITICAL: debit succeeded but transaction insert failed: %v — ref=%s user=%s",
			err, req.Reference, req.UserID)
	}

	// 5. Read updated balance
	newBalance, err := db.getBalance(req.UserID)
	if err != nil {
		log.Printf("[LEDGER] Warning: debit succeeded but balance read failed: %v", err)
		newBalance = currentBalance - req.Amount // safe estimate
	}

	log.Printf("[LEDGER] Debit complete: user=%s new_balance=%.2f amount_debited=%.2f",
		req.UserID, newBalance, req.Amount)
	return &DebitResult{Success: true, NewBalance: newBalance, AmountDebited: req.Amount}, nil
}
