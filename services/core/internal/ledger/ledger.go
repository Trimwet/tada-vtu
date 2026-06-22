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

func (c *supabaseClient) transactionExists(ref string) (bool, error) {
	data, err := c.do("GET", "/transactions?reference=eq."+ref+"&select=id", nil)
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

func (c *supabaseClient) updateTransaction(ref, status, externalRef string) error {
	patch := map[string]any{"status": status}
	if externalRef != "" {
		patch["external_reference"] = externalRef
	}
	_, err := c.do("PATCH", "/transactions?reference=eq."+ref, patch)
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

	exists, err := db.transactionExists(req.Reference)
	if err != nil {
		return nil, fmt.Errorf("idempotency check failed: %w", err)
	}
	if exists {
		log.Printf("[LEDGER] Duplicate deposit rejected: %s", req.Reference)
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

type DebitRequest struct {
	UserID      string         `json:"userId"`
	Amount      float64        `json:"amount"`
	Reference   string         `json:"reference"`
	ServiceType string         `json:"serviceType"`
	Description string         `json:"description"`
	Metadata    map[string]any `json:"metadata"`
}

type DebitResult struct {
	Success       bool    `json:"success"`
	NewBalance    float64 `json:"newBalance"`
	AmountDebited float64 `json:"amountDebited"`
}

func ProcessDebit(req DebitRequest) (*DebitResult, error) {
	db := newClient()

	log.Printf("[LEDGER] Debit start: user=%s ref=%s amount=%.2f service=%s",
		req.UserID, req.Reference, req.Amount, req.ServiceType)

	exists, err := db.transactionExists(req.Reference)
	if err != nil {
		return nil, fmt.Errorf("idempotency check failed: %w", err)
	}
	if exists {
		log.Printf("[LEDGER] Debit duplicate rejected: %s", req.Reference)
		balance, _ := db.getBalance(req.UserID)
		return &DebitResult{Success: true, NewBalance: balance, AmountDebited: req.Amount}, nil
	}

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

	if err := db.callRPC("update_user_balance", map[string]any{
		"p_user_id":     req.UserID,
		"p_amount":      req.Amount,
		"p_type":        "debit",
		"p_description": req.Description,
		"p_reference":   req.Reference,
	}); err != nil {
		return nil, fmt.Errorf("balance RPC failed: %w", err)
	}

	if err := db.insert("transactions", map[string]any{
		"user_id":            req.UserID,
		"type":               req.ServiceType,
		"amount":             -req.Amount,
		"status":             "pending",
		"description":        req.Description,
		"reference":          req.Reference,
		"external_reference": req.Reference,
		"response_data": map[string]any{
			"service_type": req.ServiceType,
			"source":       "tada-core",
			"metadata":     req.Metadata,
		},
	}); err != nil {
		log.Printf("[LEDGER] CRITICAL: debit succeeded but transaction insert failed: %v — ref=%s user=%s",
			err, req.Reference, req.UserID)
	}

	newBalance, err := db.getBalance(req.UserID)
	if err != nil {
		log.Printf("[LEDGER] Warning: debit succeeded but balance read failed: %v", err)
		newBalance = currentBalance - req.Amount
	}

	log.Printf("[LEDGER] Debit complete: user=%s new_balance=%.2f amount_debited=%.2f",
		req.UserID, newBalance, req.Amount)
	return &DebitResult{Success: true, NewBalance: newBalance, AmountDebited: req.Amount}, nil
}

// ─── Refund ───────────────────────────────────────────────────────────────────

// RefundRequest credits a user's wallet back after a failed VTU delivery.
// It is always paired with a prior ProcessDebit call via OriginalReference.
type RefundRequest struct {
	UserID            string  `json:"userId"`
	Amount            float64 `json:"amount"`
	Reference         string  `json:"reference"`         // new refund reference e.g. REFUND_TADA_AIR_xxx
	OriginalReference string  `json:"originalReference"` // the debit reference being reversed
	Description       string  `json:"description"`
}

type RefundResult struct {
	Success    bool    `json:"success"`
	NewBalance float64 `json:"newBalance"`
}

// ProcessRefund credits the user back when a VTU provider fails to deliver.
// Execution order:
//  1. Idempotency — never refund the same reference twice
//  2. Atomic RPC credit — update_user_balance with type=refund
//  3. Update original transaction to status=failed
//  4. Insert refund transaction record
//  5. Notify user
func ProcessRefund(req RefundRequest) (*RefundResult, error) {
	db := newClient()

	log.Printf("[LEDGER] Refund start: user=%s ref=%s original=%s amount=%.2f",
		req.UserID, req.Reference, req.OriginalReference, req.Amount)

	// 1. Idempotency
	exists, err := db.transactionExists(req.Reference)
	if err != nil {
		return nil, fmt.Errorf("idempotency check failed: %w", err)
	}
	if exists {
		log.Printf("[LEDGER] Refund duplicate rejected: %s", req.Reference)
		balance, _ := db.getBalance(req.UserID)
		return &RefundResult{Success: true, NewBalance: balance}, nil
	}

	// 2. Atomic credit back to user wallet
	if err := db.callRPC("update_user_balance", map[string]any{
		"p_user_id":     req.UserID,
		"p_amount":      req.Amount,
		"p_type":        "credit",
		"p_description": req.Description,
		"p_reference":   req.Reference,
	}); err != nil {
		return nil, fmt.Errorf("refund balance RPC failed: %w", err)
	}

	// 3. Mark original transaction as failed
	if err := db.updateTransaction(req.OriginalReference, "failed", ""); err != nil {
		log.Printf("[LEDGER] Warning: refund credited but original txn update failed: %v", err)
	}

	// 4. Refund transaction record
	if err := db.insert("transactions", map[string]any{
		"user_id":            req.UserID,
		"type":               "refund",
		"amount":             req.Amount,
		"status":             "success",
		"description":        req.Description,
		"reference":          req.Reference,
		"external_reference": req.OriginalReference,
	}); err != nil {
		log.Printf("[LEDGER] Warning: refund insert failed: %v", err)
	}

	// 5. Notify user
	_ = db.insert("notifications", map[string]any{
		"user_id": req.UserID,
		"type":    "info",
		"title":   "Transaction Refunded",
		"message": fmt.Sprintf("₦%.0f has been refunded to your wallet.", req.Amount),
	})

	newBalance, err := db.getBalance(req.UserID)
	if err != nil {
		log.Printf("[LEDGER] Warning: refund succeeded but balance read failed: %v", err)
	}

	log.Printf("[LEDGER] Refund complete: user=%s new_balance=%.2f", req.UserID, newBalance)
	return &RefundResult{Success: true, NewBalance: newBalance}, nil
}
