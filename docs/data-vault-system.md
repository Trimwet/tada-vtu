# Data Vault — System Design Document

> TADA VTU · Internal Technical Reference · May 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Feature Map](#2-feature-map)
3. [Architecture Blueprint](#3-architecture-blueprint)
4. [Data Pipeline](#4-data-pipeline)
5. [Skeletal Structure — File System](#5-skeletal-structure--file-system)
6. [Circulatory System — Data Flow](#6-circulatory-system--data-flow)
7. [Nervous System — State & Events](#7-nervous-system--state--events)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [QR Code Subsystem](#10-qr-code-subsystem)
11. [Security Model](#11-security-model)
12. [Error Handling & Recovery](#12-error-handling--recovery)
13. [Lifecycle State Machine](#13-lifecycle-state-machine)

---

## 1. Overview

The **Data Vault** is TADA VTU's flagship feature. It allows users to purchase and "park" a mobile data plan now, then deliver it to any phone number later — with or without an internet connection at the time of delivery, via a QR code.

### Core Value Proposition

| Problem | Solution |
|---|---|
| User has money now but wants to send data later | Park the data, deduct balance immediately |
| User wants to gift data to someone offline | Generate a QR code; recipient scans to claim |
| User wants to share data without logging in | QR link works publicly, no auth required |
| Data plan expires if not used | Auto-refund on expiry via cron job |

---

## 2. Feature Map

```
DATA VAULT
│
├── PARK
│   ├── Select network (MTN / Airtel / Glo / 9mobile)
│   ├── Select data plan
│   ├── Enter recipient phone
│   ├── Enter transaction PIN
│   ├── Deduct wallet balance (atomic RPC)
│   └── Create vault record (status: ready)
│
├── DELIVER
│   ├── Direct delivery (owner clicks "Send Now")
│   │   ├── Call Inlomax API
│   │   ├── Mark vault as delivered
│   │   └── Create delivery transaction
│   │
│   └── QR delivery (anyone scans QR)
│       ├── Generate QR code (base64url encoded)
│       ├── Share link or image
│       ├── Recipient enters phone number
│       ├── Call Inlomax API
│       ├── Mark vault as delivered
│       └── Mark QR as used (one-time)
│
├── REFUND
│   ├── Manual refund (owner requests)
│   └── Auto-refund (cron on expiry)
│       ├── Credit wallet balance
│       ├── Mark vault as refunded
│       └── Send notification
│
└── LIST
    ├── Ready items (parked, not yet delivered)
    ├── Delivered items (successfully sent)
    └── Expired items (auto-refunded)
```

---

## 3. Architecture Blueprint

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│  /dashboard/data-vault     /vault/qr/[qrData]                  │
│  ┌─────────────────┐       ┌──────────────────────┐            │
│  │  DataVaultPage  │       │  QRRedemptionPage    │            │
│  │  (authenticated)│       │  (public, no auth)   │            │
│  └────────┬────────┘       └──────────┬───────────┘            │
│           │                           │                         │
│  ┌────────▼────────┐       ┌──────────▼───────────┐            │
│  │  useDataVault   │       │  parsePersonalQRData │            │
│  │  (SWR hook)     │       │  (qr-generator.ts)   │            │
│  └────────┬────────┘       └──────────┬───────────┘            │
│           │                           │                         │
│  ┌────────▼────────┐                  │                         │
│  │  VaultQRModal   │                  │                         │
│  │  (generate QR)  │                  │                         │
│  └────────┬────────┘                  │                         │
└───────────┼───────────────────────────┼─────────────────────────┘
            │                           │
            │         HTTPS             │
            ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER (Next.js)                      │
│                                                                 │
│  POST /api/data-vault/park          ← Park data, deduct wallet  │
│  POST /api/data-vault/deliver       ← Direct delivery           │
│  POST /api/data-vault/generate-qr   ← Create/fetch QR code      │
│  POST /api/data-vault/redeem-qr     ← Public QR redemption      │
│  POST /api/data-vault/refund        ← Manual refund             │
│  GET  /api/data-vault/list          ← Fetch user's vault items  │
│  GET  /api/cron/process-vault-expiry ← Auto-expire + refund     │
│                                                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
┌───────────────────┐   ┌───────────────────────┐
│   SUPABASE (DB)   │   │   INLOMAX API (VTU)   │
│                   │   │                       │
│  data_vault       │   │  purchaseData()       │
│  vault_qr_codes   │   │  serviceID + phone    │
│  transactions     │   │  → success/processing │
│  profiles         │   │    /failed            │
│  notifications    │   └───────────────────────┘
│                   │
│  RPC Functions:   │
│  park_data_vault  │
│  update_user_     │
│    balance        │
└───────────────────┘
```

---

## 4. Data Pipeline

### 4.1 Park Pipeline

```
User Input
    │
    ▼
[Validation] ──── fail ──→ 400 Bad Request
    │
    ▼
[Rate Limit Check] ──── exceeded ──→ 429 Too Many Requests
    │
    ▼
[Fetch Profile + Balance]
    │
    ▼
[Verify Transaction PIN] ──── wrong ──→ 400 Incorrect PIN
    │
    ▼
[Check Sufficient Balance] ──── low ──→ 400 Insufficient Balance
    │
    ▼
[Create Transaction Record] (status: success, amount: -N)
    │
    ▼
[RPC: park_data_vault] ──── error ──→ Mark txn failed → 400
    │  (atomic: deduct balance + create vault record)
    ▼
[Create Notification]
    │
    ▼
200 OK → { vaultId, reference, newBalance }
```

### 4.2 Direct Delivery Pipeline

```
{ vaultId, userId }
    │
    ▼
[Fetch Vault Item] ──── not found ──→ 404
    │
    ▼
[Check status === 'ready'] ──── not ready ──→ 400
    │
    ▼
[Check not expired] ──── expired ──→ 400
    │
    ▼
[Call Inlomax API]
    │
    ├── success ──→ Update vault (delivered) → Create txn → Notify → 200
    ├── processing ──→ Update vault (delivered, processing:true) → 200
    └── failed ──→ Keep vault ready → Notify failure → 500
```

### 4.3 QR Redemption Pipeline

```
{ qrData (base64url), phoneNumber }
    │
    ▼
[parsePersonalQRData()] ──── invalid/expired ──→ 400
    │  (decode base64url → JSON → verify type + expiry)
    ▼
[Check vault_qr_codes.used_at] ──── already used ──→ 400
    │
    ▼
[Fetch Vault] ──── not found/not ready ──→ 404
    │
    ▼
[Call Inlomax API with phoneNumber]
    │
    ├── success ──→ Mark vault delivered
    │              Mark QR used (used_at + redeemed_phone)
    │              Create transaction record
    │              → 200
    │
    ├── processing ──→ Mark vault delivered (processing:true)
    │                  Mark QR used
    │                  → 200
    │
    └── failed ──→ 500
```

### 4.4 Refund Pipeline

```
{ vaultId, userId }
    │
    ▼
[Fetch Vault Item] ──── not found ──→ 404
    │
    ▼
[Check status === 'ready'] ──── not ready ──→ 400
    │
    ▼
[Update vault status → 'refunded']
    │
    ▼
[RPC: update_user_balance (credit)] ──── error ──→ Rollback vault → 500
    │
    ▼
[Update original transaction → 'refunded']
    │
    ▼
[Create Notification]
    │
    ▼
200 OK
```

---

## 5. Skeletal Structure — File System

```
src/
│
├── app/
│   ├── dashboard/
│   │   ├── data-vault/
│   │   │   └── page.tsx              ← Main vault dashboard UI
│   │   └── scan-qr/
│   │       └── page.tsx              ← QR scanner / URL paste
│   │
│   ├── vault/
│   │   └── qr/
│   │       └── [qrData]/
│   │           └── page.tsx          ← Public QR redemption page
│   │
│   └── api/
│       └── data-vault/
│           ├── park/route.ts         ← POST: park data
│           ├── deliver/route.ts      ← POST: direct delivery
│           ├── generate-qr/route.ts  ← POST: create/fetch QR
│           ├── redeem-qr/route.ts    ← POST: public QR redemption
│           ├── refund/route.ts       ← POST: manual refund
│           └── list/route.ts         ← GET: list vault items
│
├── components/
│   └── vault-qr-modal.tsx            ← QR generation modal
│
├── hooks/
│   └── useDataVault.ts               ← SWR data fetching + actions
│
└── lib/
    └── qr-generator.ts               ← QR encoding / decoding logic
```

---

## 6. Circulatory System — Data Flow

### State flowing through the system

```
                    ┌──────────────┐
                    │   profiles   │
                    │  (balance,   │
                    │    pin)      │
                    └──────┬───────┘
                           │ read/write
                           ▼
┌──────────┐    park    ┌──────────────┐   deliver   ┌─────────────┐
│  Wallet  │ ─────────→ │  data_vault  │ ──────────→ │   Inlomax   │
│ Balance  │            │  (status:    │             │    API      │
│          │ ←───────── │   ready)     │             └──────┬──────┘
│          │   refund   └──────┬───────┘                    │
└──────────┘                  │                             │ reference
                               │ generate                   │
                               ▼                            ▼
                    ┌──────────────────┐        ┌──────────────────┐
                    │  vault_qr_codes  │        │   transactions   │
                    │  (qr_data,       │        │  (park + deliver │
                    │   used_at,       │        │   records)       │
                    │   redeemed_phone)│        └──────────────────┘
                    └──────────────────┘
                               │
                               │ base64url encode
                               ▼
                    ┌──────────────────┐
                    │   QR Code URL    │
                    │  /vault/qr/      │
                    │  [base64url]     │
                    └──────────────────┘
                               │
                               │ scan / share
                               ▼
                    ┌──────────────────┐
                    │  Recipient enters│
                    │  phone number    │
                    │  (no auth needed)│
                    └──────────────────┘
```

### SWR Cache Flow

```
useDataVault(userId)
    │
    ├── SWR key: /api/data-vault/list?userId=X
    │
    ├── On mount → fetch → cache
    │
    ├── On parkData() → mutate(undefined, { revalidate: true })
    ├── On deliverData() → mutate(undefined, { revalidate: true })
    └── On refundData() → mutate(undefined, { revalidate: true })
```

---

## 7. Nervous System — State & Events

### Client State (useDataVault hook)

| State | Type | Purpose |
|---|---|---|
| `vaultData` | `VaultData \| undefined` | All vault items + stats from API |
| `loading` | `boolean` | True while initial fetch pending |
| `isParking` | `boolean` | True during park API call |
| `isDelivering` | `string \| null` | vaultId currently being delivered |
| `error` | `Error \| undefined` | SWR fetch error |

### Modal State (VaultQRModal)

| State | Type | Purpose |
|---|---|---|
| `qrCode` | `string` | Base64 PNG data URL of QR image |
| `qrId` | `string` | QR record ID from DB |
| `qrDataBase64` | `string` | base64url encoded QR payload for share URL |
| `expiresAt` | `string` | ISO expiry date |
| `isGenerating` | `boolean` | True during generate/regenerate API call |
| `isGenerated` | `boolean` | True once QR is ready to display |

### Vault Item Lifecycle Events

```
EVENT                   TRIGGER                     SIDE EFFECTS
─────────────────────────────────────────────────────────────────
vault.parked            POST /park success          - Balance deducted
                                                    - Notification sent
                                                    - SWR revalidated

vault.delivered         POST /deliver success       - Inlomax called
                        POST /redeem-qr success     - Notification sent
                                                    - Transaction created
                                                    - SWR revalidated

vault.refunded          POST /refund success        - Balance credited
                        Cron: process-vault-expiry  - Notification sent
                                                    - Original txn updated

qr.generated            POST /generate-qr           - QR stored in DB
                                                    - base64url URL built

qr.regenerated          POST /generate-qr           - Old QR deleted
                        (forceRegenerate: true)     - New QR created
                                                    - New base64url URL

qr.redeemed             POST /redeem-qr success     - QR marked used
                                                    - vault.delivered fired
```

---

## 8. Database Schema

### `data_vault`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Owner (FK → profiles) |
| `network` | `text` | MTN / Airtel / Glo / 9mobile |
| `plan_id` | `text` | Inlomax service ID |
| `plan_name` | `text` | Human-readable plan (e.g. "1GB") |
| `amount` | `numeric` | Amount paid in ₦ |
| `recipient_phone` | `text` | Default delivery phone |
| `status` | `text` | `ready` / `delivered` / `expired` / `refunded` |
| `transaction_id` | `uuid` | FK → transactions (park txn) |
| `purchased_at` | `timestamptz` | When parked |
| `delivered_at` | `timestamptz` | When delivered |
| `expires_at` | `timestamptz` | Auto-expiry date |
| `delivery_reference` | `text` | Inlomax reference |
| `metadata` | `jsonb` | Extra data (e.g. `{ processing: true }`) |

### `vault_qr_codes`

| Column | Type | Description |
|---|---|---|
| `id` | `text` | QR ID (from qrData.id) |
| `vault_id` | `uuid` | FK → data_vault |
| `user_id` | `uuid` | FK → profiles |
| `qr_data` | `jsonb` | Full QR payload + embedded PNG |
| `expires_at` | `timestamptz` | QR expiry (7 days) |
| `used_at` | `timestamptz` | When redeemed (null = unused) |
| `redeemed_phone` | `text` | Phone that claimed the data |
| `created_at` | `timestamptz` | Creation timestamp |

### RPC Functions

| Function | Purpose |
|---|---|
| `park_data_vault(...)` | Atomic: deduct balance + insert vault record |
| `update_user_balance(...)` | Credit/debit wallet with transaction log |

---

## 9. API Reference

### `POST /api/data-vault/park`

**Auth:** Required (userId in body + PIN)

```json
// Request
{
  "network": "MTN",
  "phone": "08012345678",
  "planId": "mtn-1gb",
  "amount": 420,
  "planName": "1GB",
  "userId": "uuid",
  "pin": "1234"
}

// Response 200
{
  "status": true,
  "message": "1GB successfully parked for 08012345678!",
  "data": {
    "vaultId": "uuid",
    "reference": "VAULT_...",
    "newBalance": 1580
  }
}
```

### `POST /api/data-vault/deliver`

**Auth:** Required (userId in body)

```json
// Request
{ "vaultId": "uuid", "userId": "uuid" }

// Response 200
{
  "status": true,
  "message": "1GB delivered to 08012345678 successfully!",
  "data": { "vaultId": "...", "deliveryReference": "...", "deliveredAt": "..." }
}
```

### `POST /api/data-vault/generate-qr`

**Auth:** Required (userId in body)

```json
// Request
{ "vaultId": "uuid", "userId": "uuid", "forceRegenerate": false }

// Response 200
{
  "status": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "qrId": "qr_...",
    "qrData": { ...full payload... },
    "expiresAt": "2026-05-12T...",
    "isExisting": true
  }
}
```

### `POST /api/data-vault/redeem-qr`

**Auth:** None (public endpoint)

```json
// Request
{ "qrData": "base64url_string", "phoneNumber": "08012345678" }

// Response 200
{
  "status": true,
  "message": "1GB MTN data delivered to 08012345678",
  "data": { "network": "MTN", "planSize": "1GB", "phoneNumber": "...", "deliveredAt": "..." }
}
```

### `POST /api/data-vault/refund`

**Auth:** Required (userId in body)

```json
// Request
{ "vaultId": "uuid", "userId": "uuid" }

// Response 200
{ "status": true, "message": "Data plan refunded successfully to your wallet." }
```

### `GET /api/data-vault/list`

**Auth:** Required (userId in query)

```
GET /api/data-vault/list?userId=uuid

// Response 200
{
  "status": true,
  "data": {
    "ready": [...],
    "delivered": [...],
    "expired": [...],
    "stats": {
      "totalParked": 840,
      "totalDelivered": 1260,
      "readyCount": 2,
      "deliveredCount": 3,
      "expiredCount": 0
    }
  }
}
```

---

## 10. QR Code Subsystem

### Encoding (Server — `qr-generator.ts`)

```
qrData object (JSON)
    │
    ▼
Buffer.from(JSON.stringify(qrData)).toString('base64url')
    │  (URL-safe: replaces + → -, / → _, strips =)
    ▼
https://tadavtu.com/vault/qr/{base64url}
    │
    ▼
QRCode.toDataURL(url) → PNG data URL (green on white, 400px)
```

### Decoding (Client — `parsePersonalQRData`)

```
base64url string from URL param
    │
    ▼
Normalize: replace - → +, _ → /,  re-pad with ==
    │
    ▼
atob(normalized) → JSON string → parse
    │
    ▼
Validate: type === 'personal_data'
    │
    ▼
Check: validUntil > now
    │
    ▼
Verify signature (warn only, DB check is authoritative)
    │
    ▼
Return PersonalDataQR object
```

### QR Payload Structure

```typescript
{
  id: "qr_1777633310299_73z9edo64",   // Unique QR ID
  type: "personal_data",              // Always this value
  vaultId: "uuid",                    // FK → data_vault
  ownerId: "uuid",                    // FK → profiles
  network: "MTN",
  planName: "1GB",
  planSize: "1GB",
  amount: 420,
  validUntil: "2026-05-12T11:01:50.299Z",  // 7-day expiry
  signature: "7e45d652fdf5a63c"       // SHA-256 HMAC (first 16 chars)
}
```

### Security Properties

| Property | Mechanism |
|---|---|
| One-time use | `vault_qr_codes.used_at` checked before redemption |
| Expiry | `validUntil` checked client-side + server-side |
| Tamper detection | SHA-256 signature over payload |
| No auth required | Vault looked up by ID, not user session |
| URL-safe | base64url encoding prevents `/` breaking routes |

---

## 11. Security Model

```
ENDPOINT                    AUTH        RATE LIMIT      PIN REQUIRED
────────────────────────────────────────────────────────────────────
POST /park                  userId      transaction     YES
POST /deliver               userId      transaction     NO
POST /generate-qr           userId      —               NO
POST /redeem-qr             NONE        —               NO
POST /refund                userId      transaction     NO
GET  /list                  userId      —               NO
```

- All sensitive endpoints use `SUPABASE_SERVICE_ROLE_KEY` server-side
- RLS policies on `data_vault` and `vault_qr_codes` enforce ownership
- PIN is hashed with `base64(pin + 'tada_salt_2024')` before storage
- QR redemption is intentionally public — the QR itself is the credential

---

## 12. Error Handling & Recovery

| Scenario | Behaviour |
|---|---|
| Inlomax API fails on deliver | Vault stays `ready`, user can retry |
| Inlomax returns `processing` | Vault marked `delivered` optimistically |
| park_data_vault RPC fails | Transaction marked `failed`, balance not deducted |
| refund RPC fails | Vault status rolled back to `ready` |
| QR already used | 400 — "This QR code has already been used" |
| QR expired | Caught in `parsePersonalQRData`, returns null → 400 |
| Vault expired | Cron auto-refunds, status → `expired` |
| Old base64 QR (with `/`) | Parser normalizes both base64 and base64url |

---

## 13. Lifecycle State Machine

```
                    ┌─────────┐
                    │  PARKED │  (status: ready)
                    └────┬────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
    ┌────────────┐  ┌─────────┐  ┌──────────┐
    │ DELIVERED  │  │REFUNDED │  │ EXPIRED  │
    │(via direct │  │(manual) │  │  (cron)  │
    │ or QR)     │  └─────────┘  └──────────┘
    └────────────┘
         (terminal states — no further transitions)
```

All terminal states are irreversible. Expired items are handled exclusively by the `/api/cron/process-vault-expiry` cron job scheduled daily at midnight UTC.

---

*Last updated: May 2026 — TADA VTU Engineering*
