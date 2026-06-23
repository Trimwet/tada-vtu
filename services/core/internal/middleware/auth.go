package middleware

import (
	"net/http"
	"os"
	"strings"
)

// RequireInternalAuth rejects any request whose Authorization header does not
// match the CORE_SECRET environment variable.
//
// This is an internal service secret — not a user token. Only Next.js API
// routes (and other trusted internal callers) should know this value.
// If CORE_SECRET is not set, all requests are rejected to fail safe.
func RequireInternalAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		secret := os.Getenv("CORE_SECRET")
		if secret == "" {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"server misconfigured: CORE_SECRET not set"}`, http.StatusInternalServerError)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"authorization required"}`, http.StatusUnauthorized)
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"authorization must be: Bearer <token>"}`, http.StatusUnauthorized)
			return
		}

		if parts[1] != secret {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}
