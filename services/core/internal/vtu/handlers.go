// Package vtu provides the HTTP handlers for VTU financial operations.
//
// These handlers are the bridge between Next.js API routes and the Supabase
// database. They sit on top of the abstract engine layer and add:
//   - Real Supabase persistence
//   - Idempotency enforcement
//   - Balance enforcement (no overdraft)
//   - Automatic notifications
//
// Route surface:
//   POST /ledger/deposit
//   POST /ledger/debit
//   POST /ledger/refund
//   GET  /wallet/{userId}/balance
package vtu

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"tada-vtu/services/core/internal/store"
)

// Handlers holds the Supabase client shared across all VTU handlers.
type Handlers struct {
	db *store.Client
}

// New creates a Handlers instance. Call once at startup.
func New(db *store.Client) *Handlers {
	return &Handlers{db: db}
}

// ── Deposit ───────────────────────────────────────────────────────────────────

type depositRequest struct {
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

func (h *Handlers) Deposit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req depositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.UserID == "" || req.Reference == "" || req.ExternalReference == "" {
		jsonError(w, "userId, reference, and externalReference are required", http.StatusBadRequest)
		return
	}
	if req.WalletCredit <= 0 {
		jsonError(w, "walletCredit must be greater than 0", http.StatusBadRequest)
		return
	}

	log.Printf("[DEPOSIT] start user=%s ref=%s credit=%.2f", req.UserID, req.Reference, req.WalletCredit)

	// Idempotency
	exists, err := h.db.TransactionExists(req.Reference)
	if err != nil {
		log.Printf("[DEPOSIT] idempotency check failed: %v", err)
		jsonError(w, "idempotency check failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if exists {
		log.Printf("[DEPOSIT] duplicate rejected: %s", req.Reference)
		jsonOK(w, map[string]any{"success": true, "alreadyProcessed": true})
		return
	}

	// Atomic credit via RPC
	if err := h.db.CreditBalance(req.UserID, req.WalletCredit, req.Description, req.Reference); err != nil {
		log.Printf("[DEPOSIT] balance RPC failed: %v", err)
		jsonError(w, "balance update failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Transaction record
	if err := h.db.InsertTransaction(map[string]any{
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
		log.Printf("[DEPOSIT] transaction insert failed: %v", err)
		jsonError(w, "transaction insert failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	h.db.InsertNotification(map[string]any{
		"user_id": req.UserID,
		"type":    "success",
		"title":   "Wallet Funded! 💰",
		"message": fmt.Sprintf("₦%.0f has been added to your wallet.", req.WalletCredit),
	})

	newBalance, _ := h.db.GetBalance(req.UserID)
	log.Printf("[DEPOSIT] done user=%s new_balance=%.2f", req.UserID, newBalance)
	jsonOK(w, map[string]any{"success": true, "newBalance": newBalance, "alreadyProcessed": false})
}

// ── Debit ─────────────────────────────────────────────────────────────────────

type debitRequest struct {
	UserID      string         `json:"userId"`
	Amount      float64        `json:"amount"`
	Reference   string         `json:"reference"`
	ServiceType string         `json:"serviceType"`
	Description string         `json:"description"`
	Metadata    map[string]any `json:"metadata"`
}

func (h *Handlers) Debit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req debitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.UserID == "" || req.Reference == "" || req.ServiceType == "" {
		jsonError(w, "userId, reference, and serviceType are required", http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		jsonError(w, "amount must be greater than 0", http.StatusBadRequest)
		return
	}

	log.Printf("[DEBIT] start user=%s ref=%s amount=%.2f service=%s", req.UserID, req.Reference, req.Amount, req.ServiceType)

	// Idempotency
	exists, err := h.db.TransactionExists(req.Reference)
	if err != nil {
		jsonError(w, "idempotency check failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if exists {
		balance, _ := h.db.GetBalance(req.UserID)
		jsonOK(w, map[string]any{"success": true, "newBalance": balance, "amountDebited": req.Amount})
		return
	}

	// Balance check — Core enforces no overdraft
	currentBalance, err := h.db.GetBalance(req.UserID)
	if err != nil {
		jsonError(w, "balance check failed: "+err.Error(), http.StatusNotFound)
		return
	}
	if currentBalance < req.Amount {
		log.Printf("[DEBIT] insufficient funds user=%s balance=%.2f requested=%.2f", req.UserID, currentBalance, req.Amount)
		jsonError(w,
			fmt.Sprintf("insufficient funds: balance %.2f, requested %.2f", currentBalance, req.Amount),
			http.StatusPaymentRequired, // 402
		)
		return
	}

	// Atomic debit via RPC
	if err := h.db.DebitBalance(req.UserID, req.Amount, req.Description, req.Reference); err != nil {
		jsonError(w, "balance update failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Pending transaction record (status updated by provider layer after delivery)
	if err := h.db.InsertTransaction(map[string]any{
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
		// CRITICAL: balance already debited — log loudly but don't fail the response
		log.Printf("[DEBIT] CRITICAL transaction insert failed ref=%s user=%s err=%v", req.Reference, req.UserID, err)
	}

	newBalance, err := h.db.GetBalance(req.UserID)
	if err != nil {
		newBalance = currentBalance - req.Amount // safe estimate
	}

	log.Printf("[DEBIT] done user=%s new_balance=%.2f debited=%.2f", req.UserID, newBalance, req.Amount)
	jsonOK(w, map[string]any{"success": true, "newBalance": newBalance, "amountDebited": req.Amount})
}

// ── Refund ────────────────────────────────────────────────────────────────────

type refundRequest struct {
	UserID            string  `json:"userId"`
	Amount            float64 `json:"amount"`
	Reference         string  `json:"reference"`
	OriginalReference string  `json:"originalReference"`
	Description       string  `json:"description"`
}

func (h *Handlers) Refund(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req refundRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.UserID == "" || req.Reference == "" || req.OriginalReference == "" {
		jsonError(w, "userId, reference, and originalReference are required", http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		jsonError(w, "amount must be greater than 0", http.StatusBadRequest)
		return
	}

	log.Printf("[REFUND] start user=%s ref=%s original=%s amount=%.2f", req.UserID, req.Reference, req.OriginalReference, req.Amount)

	// Idempotency
	exists, err := h.db.TransactionExists(req.Reference)
	if err != nil {
		jsonError(w, "idempotency check failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if exists {
		balance, _ := h.db.GetBalance(req.UserID)
		jsonOK(w, map[string]any{"success": true, "newBalance": balance})
		return
	}

	// Credit the user back
	if err := h.db.CreditBalance(req.UserID, req.Amount, req.Description, req.Reference); err != nil {
		jsonError(w, "refund credit failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Mark original transaction as failed
	if err := h.db.UpdateTransaction(req.OriginalReference, map[string]any{"status": "failed"}); err != nil {
		log.Printf("[REFUND] original txn update failed (non-fatal): %v", err)
	}

	// Refund record
	if err := h.db.InsertTransaction(map[string]any{
		"user_id":            req.UserID,
		"type":               "refund",
		"amount":             req.Amount,
		"status":             "success",
		"description":        req.Description,
		"reference":          req.Reference,
		"external_reference": req.OriginalReference,
	}); err != nil {
		log.Printf("[REFUND] refund record insert failed: %v", err)
	}

	h.db.InsertNotification(map[string]any{
		"user_id": req.UserID,
		"type":    "info",
		"title":   "Transaction Refunded",
		"message": fmt.Sprintf("₦%.0f has been refunded to your wallet.", req.Amount),
	})

	newBalance, _ := h.db.GetBalance(req.UserID)
	log.Printf("[REFUND] done user=%s new_balance=%.2f", req.UserID, newBalance)
	jsonOK(w, map[string]any{"success": true, "newBalance": newBalance})
}

// ── Balance ───────────────────────────────────────────────────────────────────

func (h *Handlers) Balance(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Path: /wallet/{userId}/balance
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 3 || parts[2] != "balance" {
		jsonError(w, "use GET /wallet/{userId}/balance", http.StatusNotFound)
		return
	}
	userID := parts[1]
	if userID == "" {
		jsonError(w, "userId is required", http.StatusBadRequest)
		return
	}

	balance, err := h.db.GetBalance(userID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusNotFound)
		return
	}

	jsonOK(w, map[string]any{"userId": userID, "balance": balance})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func jsonOK(w http.ResponseWriter, body any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(body)
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
