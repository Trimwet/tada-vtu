// Package wallet manages wallet state reads.
//
// All writes go through the ledger package.
// This package handles read-only balance queries.

package wallet

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

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
		http:    &http.Client{Timeout: 10 * time.Second},
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

// BalanceResult is what Core returns for GET /wallet/{userId}/balance
type BalanceResult struct {
	UserID  string  `json:"userId"`
	Balance float64 `json:"balance"`
}

// GetBalance reads the current wallet balance for a user.
// This is the only approved way for Next.js to read a balance.
func GetBalance(userID string) (*BalanceResult, error) {
	db := newClient()

	data, err := db.do("GET", "/profiles?id=eq."+userID+"&select=balance", nil)
	if err != nil {
		return nil, fmt.Errorf("balance query failed: %w", err)
	}

	var rows []struct {
		Balance float64 `json:"balance"`
	}
	if err := json.Unmarshal(data, &rows); err != nil || len(rows) == 0 {
		return nil, fmt.Errorf("profile not found for user: %s", userID)
	}

	return &BalanceResult{
		UserID:  userID,
		Balance: rows[0].Balance,
	}, nil
}
