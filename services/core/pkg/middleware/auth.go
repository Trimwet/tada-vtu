// Package middleware contains HTTP middleware for the TADAPAY core service.

package middleware

import (
	"net/http"
	"os"
	"strings"
)

// RequireInternalAuth verifies that the request comes from an authorised
// internal caller (Next.js, WhatsApp service, etc.) using a shared secret.
//
// Next.js sends:  Authorization: Bearer {CORE_SECRET}
// Core checks:    does it match os.Getenv("CORE_SECRET")?
//
// This prevents anyone on the internet from calling /ledger/* directly.
func RequireInternalAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		secret := os.Getenv("CORE_SECRET")
		if secret == "" {
			// If no secret is configured, block everything.
			// This forces you to set the env var before going live.
			http.Error(w, `{"error":"core not configured"}`, http.StatusServiceUnavailable)
			return
		}

		authHeader := r.Header.Get("Authorization")
		token := strings.TrimPrefix(authHeader, "Bearer ")

		if token != secret {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}
