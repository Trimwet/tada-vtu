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

	log.Printf("[DEPOSIT] start user=%s ref=%s ext=%s credit=%.2f", req.UserID, req.Reference, req.ExternalReference, req.WalletCredit)

	// Single atomic DB transaction: idempotency lookup (keyed on externalReference
	// — the payment provider's stable, unique ref that doesn't change between
	// webhook retries), FOR UPDATE balance lock, credit, wallet_transactions
	// audit row, transactions record, and idempotency cache — all in one call.
	// This replaces the previous TransactionExists → CreditBalance →
	// InsertTransaction sequence which had the same TOCTOU race as the debit
	// path fixed in migration 035.
	result, err := h.db.AtomicDeposit(
		req.ExternalReference, // idempotency key — stable across retries
		req.UserID,
		req.WalletCredit,
		req.Description,
		req.Reference,
		req.ExternalReference,
		req.PaymentType,
		req.Amount,
		req.Fee,
		req.Metadata,
	)
	if err != nil {
		log.Printf("[DEPOSIT] atomic_deposit failed user=%s ref=%s err=%v", req.UserID, req.Reference, err)
		jsonError(w, "deposit failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if result.AlreadyProcessed {
		log.Printf("[DEPOSIT] idempotent replay ext=%s", req.ExternalReference)
	} else {
		h.db.InsertNotification(map[string]any{
			"user_id": req.UserID,
			"type":    "success",
			"title":   "Wallet Funded! 💰",
			"message": fmt.Sprintf("₦%.0f has been added to your wallet.", req.WalletCredit),
		})
		log.Printf("[DEPOSIT] done user=%s new_balance=%.2f", req.UserID, result.NewBalance)
	}

	jsonOK(w, map[string]any{"success": true, "newBalance": result.NewBalance, "alreadyProcessed": result.AlreadyProcessed})
}

// ── Debit ─────────────────────────────────────────────────────────────────────

type debitRequest struct {
	UserID         string         `json:"userId"`
	Amount         float64        `json:"amount"`
	Reference      string         `json:"reference"`
	IdempotencyKey string         `json:"idempotencyKey"`
	ServiceType    string         `json:"serviceType"`
	Description    string         `json:"description"`
	Metadata       map[string]any `json:"metadata"`
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

	// idempotencyKey is what protects against double-charges on retry. Callers
	// SHOULD send a key that stays stable across client-side retries of the
	// same logical purchase attempt (not a fresh value per HTTP attempt). If
	// none is supplied we fall back to reference, which still closes the
	// concurrent-duplicate-request race below but does not protect against a
	// caller that mints a brand-new reference on every retry.
	idempotencyKey := req.IdempotencyKey
	if idempotencyKey == "" {
		idempotencyKey = req.Reference
	}

	log.Printf("[DEBIT] start user=%s ref=%s key=%s amount=%.2f service=%s", req.UserID, req.Reference, idempotencyKey, req.Amount, req.ServiceType)

	// Single atomic DB transaction: idempotency lookup, balance row lock,
	// balance check, balance update, and pending-transaction insert all
	// happen inside one Postgres function call (atomic_debit). This closes
	// the TOCTOU race that existed when those steps were separate calls —
	// previously two concurrent requests for the same reference could both
	// pass the idempotency check before either had written a row.
	result, err := h.db.AtomicDebit(idempotencyKey, req.UserID, req.Amount, req.Description, req.Reference, req.ServiceType, req.Metadata)
	if err != nil {
		msg := err.Error()
		switch {
		case strings.Contains(msg, "insufficient funds"):
			log.Printf("[DEBIT] insufficient funds user=%s requested=%.2f", req.UserID, req.Amount)
			jsonError(w, msg, http.StatusPaymentRequired) // 402
		case strings.Contains(msg, "profile not found"):
			jsonError(w, fmt.Sprintf("profile not found: %s", req.UserID), http.StatusNotFound)
		default:
			log.Printf("[DEBIT] atomic_debit failed user=%s ref=%s err=%v", req.UserID, req.Reference, err)
			jsonError(w, "balance update failed: "+msg, http.StatusInternalServerError)
		}
		return
	}

	log.Printf("[DEBIT] done user=%s new_balance=%.2f debited=%.2f", req.UserID, result.NewBalance, result.AmountDebited)
	jsonOK(w, map[string]any{"success": true, "newBalance": result.NewBalance, "amountDebited": result.AmountDebited})
}

// ── Refund ────────────────────────────────────────────────────────────────────

type refundRequest struct {
	UserID            string  `json:"userId"`
	Amount            float64 `json:"amount"`
	Reference         string  `json:"reference"`
	IdempotencyKey    string  `json:"idempotencyKey"`
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

	idempotencyKey := req.IdempotencyKey
	if idempotencyKey == "" {
		idempotencyKey = req.Reference
	}

	log.Printf("[REFUND] start user=%s ref=%s key=%s original=%s amount=%.2f", req.UserID, req.Reference, idempotencyKey, req.OriginalReference, req.Amount)

	// Single atomic DB transaction: idempotency lookup, credit, marking the
	// original transaction failed, and inserting the refund record all
	// happen inside one Postgres function call (atomic_refund).
	result, err := h.db.AtomicRefund(idempotencyKey, req.UserID, req.Amount, req.Description, req.Reference, req.OriginalReference)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "profile not found") {
			jsonError(w, fmt.Sprintf("profile not found: %s", req.UserID), http.StatusNotFound)
			return
		}
		log.Printf("[REFUND] atomic_refund failed user=%s ref=%s err=%v", req.UserID, req.Reference, err)
		jsonError(w, "refund failed: "+msg, http.StatusInternalServerError)
		return
	}

	h.db.InsertNotification(map[string]any{
		"user_id": req.UserID,
		"type":    "info",
		"title":   "Transaction Refunded",
		"message": fmt.Sprintf("₦%.0f has been refunded to your wallet.", req.Amount),
	})

	log.Printf("[REFUND] done user=%s new_balance=%.2f", req.UserID, result.NewBalance)
	jsonOK(w, map[string]any{"success": true, "newBalance": result.NewBalance})
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
