// Package models contains all shared data types for the TADAPAY core.
//
// These types are the source of truth for data shape across the service.
// Next.js TypeScript types in src/types/ should mirror these.

package models

import (
	"time"
)

// User represents a TADAPAY account holder.
type User struct {
	ID          string    `json:"id"`
	PhoneNumber string    `json:"phone_number"`
	Email       string    `json:"email"`
	Balance     float64   `json:"balance"`
	KYCLevel    int       `json:"kyc_level"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// Transaction is the immutable record of every money movement.
type Transaction struct {
	ID                string            `json:"id"`
	UserID            string            `json:"user_id"`
	Type              TransactionType   `json:"type"`    // debit | credit | park | refund | deposit
	Status            TransactionStatus `json:"status"`  // pending | success | failed
	Amount            float64           `json:"amount"`
	Reference         string            `json:"reference"`          // internal idempotency key
	ExternalReference string            `json:"external_reference"` // provider reference
	Description       string            `json:"description"`
	Metadata          map[string]any    `json:"metadata"`
	CreatedAt         time.Time         `json:"created_at"`
}

type TransactionType string

const (
	TransactionTypeDebit    TransactionType = "debit"
	TransactionTypeCredit   TransactionType = "credit"
	TransactionTypePark     TransactionType = "park"
	TransactionTypeRefund   TransactionType = "refund"
	TransactionTypeDeposit  TransactionType = "deposit"
	TransactionTypeDeliver  TransactionType = "deliver"
)

type TransactionStatus string

const (
	TransactionStatusPending    TransactionStatus = "pending"
	TransactionStatusProcessing TransactionStatus = "processing"
	TransactionStatusSuccess    TransactionStatus = "success"
	TransactionStatusFailed     TransactionStatus = "failed"
)

// LedgerEntry is the atomic record written for every balance change.
type LedgerEntry struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	TransactionID string    `json:"transaction_id"`
	BalanceBefore float64   `json:"balance_before"`
	BalanceAfter  float64   `json:"balance_after"`
	Delta         float64   `json:"delta"` // positive = credit, negative = debit
	CreatedAt     time.Time `json:"created_at"`
}

// VTURequest is what Eve receives and routes to a provider.
type VTURequest struct {
	Type    VTUType `json:"type"`   // airtime | data | cable | electricity
	Network string  `json:"network"` // MTN | Airtel | Glo | 9mobile
	Phone   string  `json:"phone"`
	Amount  float64 `json:"amount"`
	PlanID  string  `json:"plan_id,omitempty"`
	UserID  string  `json:"user_id"`
}

type VTUType string

const (
	VTUTypeAirtime     VTUType = "airtime"
	VTUTypeData        VTUType = "data"
	VTUTypeCable       VTUType = "cable"
	VTUTypeElectricity VTUType = "electricity"
)

// VTUResult is what a provider returns after execution.
type VTUResult struct {
	Success   bool   `json:"success"`
	Reference string `json:"reference"`
	Message   string `json:"message"`
	Provider  string `json:"provider"`
}
