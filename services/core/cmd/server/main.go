package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"tada-vtu/services/core/internal/accounts"
	"tada-vtu/services/core/internal/engine"
	"tada-vtu/services/core/internal/ledger"
	"tada-vtu/services/core/internal/merchant"
	"tada-vtu/services/core/internal/middleware"
	"tada-vtu/services/core/internal/offline"
	"tada-vtu/services/core/internal/providers"
	"tada-vtu/services/core/internal/reconciliation"
	"tada-vtu/services/core/internal/runs"
	"tada-vtu/services/core/internal/store"
	"tada-vtu/services/core/internal/transactions"
	"tada-vtu/services/core/internal/vtu"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env.local if present (development). In production, env vars are
	// injected by the host (Railway, Render, etc.) — godotenv does nothing if
	// the file doesn't exist.
	if err := godotenv.Load("../../.env.local"); err != nil {
		log.Println("No .env.local found — reading from environment")
	}

	port := os.Getenv("CORE_PORT")
	if port == "" {
		port = "8080"
	}

	// ── Abstract financial engine (in-memory, intent/run/reconciliation model)
	l := ledger.NewLedger()
	tx := transactions.NewService()
	runSvc := runs.NewService()
	providerRegistry := providers.NewRegistry()
	reconSvc := reconciliation.NewService()
	accountSvc := accounts.NewService()
	merchantSvc := merchant.NewService()
	offlineSvc := offline.NewService()
	engineSvc := engine.NewService(l, tx, runSvc, providerRegistry, reconSvc)

	// ── VTU layer (Supabase-connected, used by Next.js)
	db := store.New()
	vtuHandlers := vtu.New(db)

	// ── Startup health checks ──────────────────────────────────────────────
	log.Printf("🚀 TADAPAY Core starting on port %s", port)

	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		supabaseURL = os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	}
	if supabaseURL == "" {
		log.Println("⚠️  WARNING: SUPABASE_URL not set — VTU ledger endpoints will fail")
	} else {
		log.Printf("✅ Supabase: %s...", supabaseURL[:min(30, len(supabaseURL))])
	}
	if os.Getenv("SUPABASE_SERVICE_ROLE_KEY") == "" {
		log.Println("⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not set")
	} else {
		log.Println("✅ Supabase service role key: loaded")
	}
	if os.Getenv("CORE_SECRET") == "" {
		log.Println("⚠️  WARNING: CORE_SECRET not set — all protected endpoints will return 500")
	} else {
		log.Println("✅ Core secret: loaded")
	}

	mux := http.NewServeMux()

	// ── Public ────────────────────────────────────────────────────────────
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","service":"tada-core"}`)
	})

	// ── VTU ledger endpoints (Supabase-backed, auth required) ────────────
	// These are what Next.js calls for every money movement.
	mux.HandleFunc("/ledger/deposit", middleware.RequireInternalAuth(vtuHandlers.Deposit))
	mux.HandleFunc("/ledger/debit",   middleware.RequireInternalAuth(vtuHandlers.Debit))
	mux.HandleFunc("/ledger/refund",  middleware.RequireInternalAuth(vtuHandlers.Refund))
	mux.HandleFunc("/wallet/",        middleware.RequireInternalAuth(vtuHandlers.Balance))

	// ── Abstract engine endpoints (auth required) ─────────────────────────
	// ⚠️  SIMULATION ONLY — these endpoints use the IN-MEMORY engine.
	// They do NOT touch Supabase and do NOT move real money.
	// Real money endpoints are: /ledger/deposit, /ledger/debit, /ledger/refund
	//
	// These exist as scaffolding for the future double-entry ledger system.
	// Do NOT call these from Next.js routes or Eve tools expecting real money movement.
	mux.HandleFunc("/sim/accounts",       middleware.RequireInternalAuth(makeAccountsHandler(accountSvc)))
	mux.HandleFunc("/sim/balances",       middleware.RequireInternalAuth(makeBalancesHandler(l)))
	mux.HandleFunc("/sim/merchants",      middleware.RequireInternalAuth(makeMerchantsHandler(merchantSvc)))
	mux.HandleFunc("/sim/offline-events", middleware.RequireInternalAuth(makeOfflineHandler(offlineSvc)))
	mux.HandleFunc("/sim/transfers",      middleware.RequireInternalAuth(makeTransfersHandler(engineSvc)))
	mux.HandleFunc("/sim/refunds",        middleware.RequireInternalAuth(makeRefundsHandler(engineSvc)))
	mux.HandleFunc("/sim/intents",        middleware.RequireInternalAuth(makeIntentsHandler(engineSvc, tx)))

	log.Printf("   POST /ledger/deposit     ← Next.js wallet funding")
	log.Printf("   POST /ledger/debit       ← Next.js VTU purchase")
	log.Printf("   POST /ledger/refund      ← Next.js provider failure refund")
	log.Printf("   GET  /wallet/{id}/balance ← Next.js balance read")
	log.Printf("   POST /sim/transfers      ← simulation only (in-memory, not Supabase)")
	log.Printf("   POST /sim/refunds        ← simulation only (in-memory, not Supabase)")
	log.Printf("   POST /sim/intents        ← simulation only (in-memory, not Supabase)")

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ── Engine handler factories ──────────────────────────────────────────────────

func makeAccountsHandler(svc *accounts.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct{ ID string `json:"id"` }
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		account, err := svc.CreateAccount(req.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(account)
	}
}

func makeBalancesHandler(l *ledger.Ledger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		accountID := r.URL.Query().Get("account_id")
		balance, err := l.Balance(accountID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"account_id": accountID, "balance": balance})
	}
}

func makeMerchantsHandler(svc *merchant.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		m, err := svc.CreateMerchant(req.ID, req.Name)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(m)
	}
}

func makeOfflineHandler(svc *offline.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			ID   string `json:"id"`
			Kind string `json:"kind"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		event, err := svc.CreateEvent(req.ID, req.Kind)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(event)
	}
}

func makeTransfersHandler(svc *engine.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			FromAccountID string `json:"from_account_id"`
			ToAccountID   string `json:"to_account_id"`
			Amount        int64  `json:"amount"`
			RequestID     string `json:"request_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		result, err := svc.ProcessTransfer(req.FromAccountID, req.ToAccountID, req.Amount, req.RequestID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"intent": result.Intent, "run": result.Run, "reconciliation": result.Reconciliation})
	}
}

func makeRefundsHandler(svc *engine.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			AccountID string `json:"account_id"`
			Amount    int64  `json:"amount"`
			RequestID string `json:"request_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		result, err := svc.ProcessRefund(req.AccountID, req.Amount, req.RequestID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"intent": result.Intent, "run": result.Run, "reconciliation": result.Reconciliation})
	}
}

func makeIntentsHandler(svc *engine.Service, tx *transactions.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			AccountID string `json:"account_id"`
			Action    string `json:"action"`
			Amount    int64  `json:"amount"`
			RequestID string `json:"request_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		var response struct {
			Intent         *transactions.Intent  `json:"intent"`
			Run            *runs.Run             `json:"run,omitempty"`
			Reconciliation *reconciliation.Entry `json:"reconciliation,omitempty"`
		}

		if req.Action == "deposit" {
			result, err := svc.ProcessDeposit(req.AccountID, req.Amount, req.RequestID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			response.Intent = result.Intent
			response.Run = result.Run
			response.Reconciliation = result.Reconciliation
		} else {
			intent, err := tx.CreateIntent(req.AccountID, req.Action, req.Amount, req.RequestID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			response.Intent = intent
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	}
}
