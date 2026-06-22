// Package db provides a lightweight HTTP wrapper around the Supabase REST API.
// Core uses the service role key, which bypasses RLS.
// This is intentional — Core is the trusted financial authority.

package db

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// SupabaseClient wraps Supabase REST API calls.
type SupabaseClient struct {
	baseURL    string
	serviceKey string
	http       *http.Client
}

// New creates a SupabaseClient from environment variables.
func New() *SupabaseClient {
	return &SupabaseClient{
		baseURL:    os.Getenv("SUPABASE_URL"),
		serviceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		http:       &http.Client{},
	}
}

// do executes an authenticated request to Supabase.
func (c *SupabaseClient) do(method, path string, body any, prefer string) ([]byte, int, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, fmt.Errorf("marshal error: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.baseURL+path, reqBody)
	if err != nil {
		return nil, 0, fmt.Errorf("request build error: %w", err)
	}

	req.Header.Set("apikey", c.serviceKey)
	req.Header.Set("Authorization", "Bearer "+c.serviceKey)
	req.Header.Set("Content-Type", "application/json")
	if prefer != "" {
		req.Header.Set("Prefer", prefer)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("http error: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("read error: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, resp.StatusCode, fmt.Errorf("supabase %d: %s", resp.StatusCode, string(data))
	}

	return data, resp.StatusCode, nil
}

// RPC calls a Supabase database function (stored procedure).
func (c *SupabaseClient) RPC(funcName string, params any) ([]byte, error) {
	data, _, err := c.do("POST", "/rest/v1/rpc/"+funcName, params, "return=representation")
	return data, err
}

// Select queries a table with optional filters appended to the path.
// Example: c.Select("transactions", "?external_reference=eq.REF123&select=id")
func (c *SupabaseClient) Select(table, query string) ([]byte, error) {
	data, _, err := c.do("GET", "/rest/v1/"+table+query, nil, "")
	return data, err
}

// Insert inserts a row into a table.
func (c *SupabaseClient) Insert(table string, row any) error {
	_, _, err := c.do("POST", "/rest/v1/"+table, row, "return=minimal")
	return err
}
