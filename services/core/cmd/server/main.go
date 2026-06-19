package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/Trimwet/tada-core/internal/ledger"
	"github.com/Trimwet/tada-core/internal/wallet"
	"github.com/Trimwet/tada-core/pkg/middleware"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env.local"); err != nil {
		log.Println("No .env.local found, reading from environment variables")
	}

	port := os.Getenv("CORE_PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// ── Public ────────────────────────────────────────────────────────────────
	mux.HandleFunc("/health", handleHealth)

	// ── Ledger (requires CORE_SECRET) ─────────────────────────────────────────
	mux.HandleFunc("/ledger/deposit", middleware.RequireInternalAuth(handleDeposit))
	mux.HandleFunc("/ledger/debit",   middleware.RequireInternalAuth(handleDebit))

	// ── Wallet (requires CORE_SECRET) ─────────────────────────────────────────
	// GET /wallet/{userId}/balance
	mux.HandleFunc("/wallet/", middleware.RequireInternalAuth(handleWallet))

	// Coming next:
	// POST /ledger/refund
	// POST /vtu/airtime
	// POST /vtu/data

	// Startup checks
	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		supabaseURL = os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	}
	if supabaseURL == "" {
		log.Println("⚠️  WARNING: SUPABASE_URL not set — ledger calls will fail")
	} else {
		log.Printf("✅ Supabase: %s...", supabaseURL[:30])
	}
	if os.Getenv("SUPABASE_SERVICE_ROLE_KEY") == "" {
		log.Println("⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not set")
	} else {
		log.Println("✅ Supabase service role key: loaded")
	}
	if os.Getenv("CORE_SECRET") == "" {
		log.Println("⚠️  WARNING: CORE_SECRET not set — all ledger endpoints blocked")
	} else {
		log.Println("✅ Core secret: loaded")
	}

	log.Printf("🚀 TADAPAY Core running on port %s", port)
	log.Printf("   POST /ledger/deposit")
	log.Printf("   POST /ledger/debit")
	log.Printf("   GET  /wallet/{userId}/balance")
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

// ─── Handlers ────────────────────────────────────────────────────────────────

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok","service":"tada-core"}`)
}

func handleDeposit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	var req ledger.DepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if req.UserID == "" || req.Reference == "" || req.ExternalReference == "" {
		http.Error(w, `{"error":"userId, reference, and externalReference are required"}`, http.StatusBadRequest)
		return
	}
	if req.WalletCredit <= 0 {
		http.Error(w, `{"error":"walletCredit must be greater than 0"}`, http.StatusBadRequest)
		return
	}
	result, err := ledger.ProcessDeposit(req)
	if err != nil {
		log.Printf("[DEPOSIT] Error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func handleDebit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	var req ledger.DebitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if req.UserID == "" || req.Reference == "" || req.ServiceType == "" {
		http.Error(w, `{"error":"userId, reference, and serviceType are required"}`, http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		http.Error(w, `{"error":"amount must be greater than 0"}`, http.StatusBadRequest)
		return
	}
	result, err := ledger.ProcessDebit(req)
	if err != nil {
		log.Printf("[DEBIT] Error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		statusCode := http.StatusInternalServerError
		if strings.HasPrefix(err.Error(), "insufficient funds:") {
			statusCode = http.StatusPaymentRequired // 402
		}
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleWallet routes GET /wallet/{userId}/balance
func handleWallet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Parse: /wallet/{userId}/balance
	// path: ["", "wallet", "{userId}", "balance"]
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 3 || parts[2] != "balance" {
		http.Error(w, `{"error":"use GET /wallet/{userId}/balance"}`, http.StatusNotFound)
		return
	}
	userID := parts[1]
	if userID == "" {
		http.Error(w, `{"error":"userId is required"}`, http.StatusBadRequest)
		return
	}

	result, err := wallet.GetBalance(userID)
	if err != nil {
		log.Printf("[WALLET] Balance error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
