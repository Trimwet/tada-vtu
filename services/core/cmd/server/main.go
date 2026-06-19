// Package main is the entry point for the TADAPAY financial core service.
//
// This service runs as a standalone HTTP server.
// Next.js calls it. WhatsApp calls it. Eve lives inside it.
//
// Status: Scaffold only. Implementation starts in v2/financial-core branch.

package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("CORE_PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// Health check — used by Next.js to verify core is alive
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","service":"tada-core"}`)
	})

	// Ledger endpoints (to be implemented)
	// POST /ledger/debit     — deduct from wallet
	// POST /ledger/credit    — add to wallet
	// GET  /ledger/balance   — read current balance
	// POST /ledger/park      — atomic park (replaces park_data_vault RPC)
	// POST /ledger/deposit   — process incoming payment (replaces processDeposit)

	// VTU endpoints (to be implemented)
	// POST /vtu/airtime  — buy airtime (routes through Eve → Inlomax)
	// POST /vtu/data     — buy data plan
	// POST /vtu/cable    — cable subscription
	// POST /vtu/electricity — electricity token

	log.Printf("🚀 TADAPAY Core running on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
