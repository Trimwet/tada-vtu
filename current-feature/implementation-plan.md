# Implementation Plan — Withdrawal & Automated Refund

## Architecture

```
Frontend (bank-withdrawal-modal.tsx)
  │ POST /api/withdrawal/transfer
  ▼
Withdrawal Route (app/api/withdrawal/transfer/route.ts)
  │ 1. Verify auth + PIN
  │ 2. Calculate transfer fee via getTransferFee()
  │ 3. Insert withdrawals record (status=processing)
  │ 4. coreDebit() — atomic wallet deduction
  │ 5. initiateTransfer() — Flutterwave transfer API
  │ 6a. On success → update withdrawals + notify user
  │ 6b. On failure → coreRefund() → restore balance
  │
  ▼
Flutterwave Webhook (app/api/flutterwave/webhook/route.ts)
  │ transfer.completed → SUCCESSFUL → mark withdrawal done
  │ transfer.completed → FAILED → coreRefund() + mark failed
  ▼
Go Core (services/core/...)
  │ /ledger/debit  → atomic_debit() RPC
  │ /ledger/refund → atomic_refund() RPC
  ▼
Supabase RPCs
  │ atomic_debit()  — idempotent balance deduction + pending tx
  │ atomic_refund() — idempotent balance credit + refund tx
```

## Components

### 1. Fee Display (Frontend)
- **File:** `src/components/bank-withdrawal-modal.tsx`
- **Endpoint:** `POST /api/flutterwave/fee-check`
- Reads `{ amount }` from body, calls `getTransferFee()`, returns `{ status, fee }`
- Fallback: ₦10/₦25/₦50 if API fails (wrong values — see corrections)

### 2. Withdrawal Route
- **File:** `src/app/api/withdrawal/transfer/route.ts`
- Validates: session, PIN (hashed with `tada_salt_2024`), min ₦100 / max ₦500k
- Fee: `getTransferFee()` queries Flutterwave API, falls back to ₦10.75/₦26.88/₦53.75
- Debit: `coreDebit()` — Go Core first, Supabase `atomic_debit` RPC fallback
- Transfer: `initiateTransfer()` — Flutterwave `POST /transfers`
- Refund: `coreRefund()` on transfer failure — Go Core first, Supabase `atomic_refund` RPC fallback

### 3. Flutterwave Webhook
- **File:** `src/app/api/flutterwave/webhook/route.ts`
- `charge.completed` → `processDeposit()` for wallet funding
- `transfer.completed` → status SUCCESSFUL: mark withdrawal + transaction done
- `transfer.completed` → status FAILED: call `coreRefund()`, mark withdrawal failed
- Always returns 200 to prevent Flutterwave disabling the webhook

### 4. Go Core
- **File:** `services/core/cmd/server/main.go` (routes)
- **File:** `services/core/internal/vtu/handlers.go` (Debit, Refund handlers)
- **File:** `services/core/internal/store/supabase.go` (AtomicRefund, AtomicDebit RPC calls)
- Debit: `POST /ledger/debit` → `atomic_debit` RPC
- Refund: `POST /ledger/refund` → `atomic_refund` RPC

### 5. Supabase RPCs
- **File:** `supabase/migrations/035_idempotency_and_atomic_debit.sql`
- `atomic_debit()`: idempotency check → FOR UPDATE lock → balance check → debit → insert pending tx → cache result
- `atomic_refund()`: idempotency check → FOR UPDATE lock → credit → insert wallet_transactions → mark original tx failed → insert refund tx → cache result

### 6. Migration 040 (Fix)
- **File:** `supabase/migrations/040_fix_atomic_refund_balance_tracking.sql`
- Fixes `atomic_refund()` to read current balance with `SELECT ... FOR UPDATE` and include `balance_before`/`balance_after` in `wallet_transactions` insert (was crashing with NOT NULL violation)

## Data Flow (Happy Path)
1. User enters amount → fee-check returns correct fee
2. User confirms with PIN → POST /api/withdrawal/transfer
3. Route verifies auth + PIN
4. Route calls `getTransferFee(amount)` → ₦X
5. Route inserts `withdrawals` record (status: processing)
6. Route calls `coreDebit(amount + fee)` → balance -= (amount + fee), tx created
7. Route calls `initiateTransfer(amount)` → Flutterwave returns success
8. Route updates `transactions.external_reference` + `withdrawals.flw_reference`
9. Flutterwave webhook fires `transfer.completed` SUCCESSFUL
10. Webhook updates withdrawal + transaction to success, notifies user

## Data Flow (Failed Transfer — Refund Path)
1-6. Same as happy path
7. Route calls `initiateTransfer(amount)` → Flutterwave returns success (async)
8. Route updates `withdrawals.flw_reference`, returns 200 to user
9. Flutterwave webhook fires `transfer.completed` FAILED
10. Webhook calls `coreRefund(amount + fee)` → balance += (amount + fee), refund tx created
11. Webhook updates withdrawal to failed with `failure_reason`
12. User notified

## Database Schema (relevant tables)

### profiles
| Column   | Type    | Notes                |
|----------|---------|----------------------|
| id       | UUID    | PK                   |
| email    | TEXT    |                      |
| balance  | DECIMAL | User's wallet        |
| pin      | TEXT    | base64 hashed PIN    |

### withdrawals
| Column         | Type    | Notes                         |
|----------------|---------|-------------------------------|
| id             | UUID    | PK                            |
| user_id        | UUID    | FK → profiles.id              |
| amount         | DECIMAL | Withdrawal amount             |
| fee            | DECIMAL | Transfer fee                  |
| bank_code      | TEXT    | Flutterwave bank code         |
| bank_name      | TEXT    |                                |
| account_number | TEXT    |                                |
| account_name   | TEXT    |                                |
| status         | TEXT    | pending/processing/success/failed |
| reference      | TEXT    | UNIQUE                        |
| flw_reference  | TEXT    | Flutterwave ref (nullable)    |
| failure_reason | TEXT    |                                |

### transactions
| Column            | Type    | Notes                         |
|-------------------|---------|-------------------------------|
| id                | UUID    | PK                            |
| user_id           | UUID    | FK → profiles.id              |
| type              | TEXT    | deposit/airtime/data/.../withdrawal/refund |
| amount            | DECIMAL | Negative for debits           |
| status            | TEXT    | pending/success/failed        |
| reference         | TEXT    | UNIQUE                        |
| external_reference| TEXT    | Flutterwave ref               |

### wallet_transactions
| Column         | Type    | Notes                         |
|----------------|---------|-------------------------------|
| id             | UUID    | PK                            |
| user_id        | UUID    | FK → profiles.id              |
| type           | TEXT    | credit/debit                  |
| amount         | DECIMAL |                                |
| balance_before | DECIMAL | NOT NULL                      |
| balance_after  | DECIMAL | NOT NULL                      |
| reference      | TEXT    |                                |
