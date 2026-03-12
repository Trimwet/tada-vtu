# TADA VTU Developer API System Architecture

## Overview

The TADA VTU Developer API is a reseller-focused system that allows developers to integrate airtime and data purchase functionality into their own applications. The system provides API key authentication, usage tracking, and webhook notifications for transaction events.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TADA VTU PLATFORM                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────┐         ┌──────────────────────────────────────────┐   │
│  │   DEVELOPER PORTAL  │         │           API GATEWAY                   │   │
│  │   (Dashboard)       │         │     (Next.js Route Handlers)            │   │
│  │                      │         │                                           │   │
│  │  • API Keys Manager │         │  • /api/v1/airtime/buy                  │   │
│  │  • Webhooks Manager │────────▶│  • /api/v1/data/buy                    │   │
│  │  • Usage Stats      │         │  • /api/v1/data/plans                  │   │
│  │  • Documentation   │         │  • /api/v1/wallet/balance               │   │
│  └──────────────────────┘         └──────────────────────────────────────────┘   │
│              │                                    │                              │
│              │ REST API                           │                              │
│              ▼                                    ▼                              │
│  ┌──────────────────────┐         ┌──────────────────────────────────────────┐   │
│  │  SUPABASE DATABASE   │         │         AUTHENTICATION LAYER            │   │
│  │                      │         │                                           │   │
│  │  • reseller_api_keys│◀──────▶│  • validateResellerApiKey()             │   │
│  │  • reseller_webhooks│         │  • updateApiKeyUsage()                  │   │
│  │  • reseller_webhook_│         │  • Rate limiting                        │   │
│  │    logs             │         │  • Monthly quota tracking               │   │
│  │  • profiles         │         │                                           │   │
│  └──────────────────────┘         └──────────────────────────────────────────┘   │
│              │                                    │                              │
│              │                                    ▼                              │
│  ┌──────────────────────┐         ┌──────────────────────────────────────────┐   │
│  │   TRANSACTION LAYER  │         │        WEBHOOK DELIVERY SYSTEM         │   │
│  │                      │         │                                           │   │
│  │  • Create transaction│         │  • sendTransactionWebhook()             │   │
│  │  • Process payment  │────────▶│  • deliverWebhook()                     │   │
│  │  • Update status    │         │  • Retry with exponential backoff      │   │
│  │  • Record logs      │         │  • HMAC SHA256 signatures              │   │
│  └──────────────────────┘         └──────────────────────────────────────────┘   │
│              │                                    │                              │
│              ▼                                    ▼                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │                        EXTERNAL SERVICES                                 │    │
│  │                                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │    │
│  │  │   INLOMAX   │  │ FLUTTERWAVE │  │   PROVIDER  │  │  DEVELOPER  │   │    │
│  │  │  (VTU API)  │  │  (Payments) │  │   ROUTER    │  │  WEBHOOKS   │   │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table: `reseller_api_keys`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to profiles |
| `api_key` | TEXT | Unique API key (format: `tada_live_xxxxxxxx`) |
| `api_secret` | TEXT | Secret for authentication |
| `name` | TEXT | Human-readable name for the key |
| `is_active` | BOOLEAN | Whether the key is active |
| `rate_limit` | INTEGER | Requests per minute (default: 60) |
| `monthly_limit` | DECIMAL(12,2) | Monthly spending limit |
| `monthly_usage` | DECIMAL(12,2) | Current month's usage |
| `last_used_at` | TIMESTAMPTZ | Last time the key was used |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `expires_at` | TIMESTAMPTZ | Optional expiration date |

### Table: `reseller_webhooks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to profiles |
| `url` | TEXT | Webhook endpoint URL |
| `events` | TEXT[] | Array of subscribed events |
| `is_active` | BOOLEAN | Whether webhook is active |
| `secret` | TEXT | Secret for HMAC signature verification |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Table: `reseller_webhook_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `webhook_id` | UUID | Foreign key to reseller_webhooks |
| `event` | TEXT | Event type |
| `payload` | JSONB | Full webhook payload |
| `status` | TEXT | success/failed/pending |
| `status_code` | INTEGER | HTTP response code |
| `error_message` | TEXT | Error details if failed |
| `delivered_at` | TIMESTAMPTZ | Delivery timestamp |

---

## API Endpoints

### Authentication

All API requests require two headers:
- `X-API-Key`: The developer's API key
- `X-API-Secret`: The developer's API secret (recommended)

### Available Endpoints

#### 1. Purchase Airtime
```
POST /api/v1/airtime/buy
```

**Request Body:**
```json
{
  "network": "mtn",
  "phone": "08012345678",
  "amount": 1000
}
```

**Response:**
```json
{
  "status": true,
  "message": "Airtime purchase successful",
  "data": {
    "reference": "TDA-xxxxx",
    "network": "mtn",
    "phone": "08012345678",
    "amount": 1000,
    "status": "success"
  }
}
```

#### 2. Purchase Data
```
POST /api/v1/data/buy
```

**Request Body:**
```json
{
  "network": "mtn",
  "phone": "08012345678",
  "plan_id": "mtn-500mb"
}
```

#### 3. Get Data Plans
```
GET /api/v1/data/plans?network=mtn
```

#### 4. Check Wallet Balance
```
GET /api/v1/wallet/balance
```

---

## Webhook System

### Supported Events

| Event | Description |
|-------|-------------|
| `transaction.completed` | Transaction was successful |
| `transaction.failed` | Transaction failed |

### Webhook Payload Structure

```json
{
  "event": "transaction.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "reference": "TDA-ABC123",
    "type": "data",
    "status": "success",
    "network": "mtn",
    "phone": "08012345678",
    "amount": 500,
    "externalReference": "EXT-123"
  }
}
```

### Webhook Security

Webhooks are signed using HMAC-SHA256. The signature is included in the `X-TADA-Signature` header.

**Verification Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Retry Logic

The webhook delivery system uses exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay

Maximum 3 retry attempts with 10-second timeout per request.

---

## Data Flow Diagrams

### 1. API Request Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  DEVELOPER  │────▶│   VTU API   │────▶│  AUTH       │────▶│  DATABASE   │
│  APP        │     │  ENDPOINT   │     │  VALIDATOR  │     │  CHECK      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                    │                    │
                           ▼                    ▼                    ▼
                    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
                    │  CHECK      │      │  QUOTA      │      │  EXECUTE    │
                    │  RATE LIMIT │      │  CHECK      │      │  REQUEST    │
                    └─────────────┘      └─────────────┘      └─────────────┘
                                                                  │
                           ◀───────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │  INLOMAX    │────▶│  TRANSACT. │────▶│  WEBHOOK    │
                    │  PROVIDER   │     │  RECORDED  │     │  TRIGGERED  │
                    └─────────────┘     └─────────────┘     └─────────────┘
```

### 2. Webhook Delivery Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  TRANSACT. │────▶│  FIND       │────▶│  FILTER     │────▶│  SEND       │
│  COMPLETE  │     │  USER       │     │  WEBHOOKS   │     │  WEBHOOKS   │
└─────────────┘     │  WEBHOOKS  │     │  BY EVENT   │     │  IN PARALLEL
                    └─────────────┘     └─────────────┘     └─────────────┘
                                                                     │
                           ◀───────────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │  RETRY      │────▶│  LOG        │────▶│  COMPLETE   │
                    │  IF FAILED  │     │  DELIVERY   │     │             │
                    └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Security Features

### 1. API Key Authentication
- Unique API key per user
- API secret for additional security
- Keys can be activated/deactivated
- Keys can expire

### 2. Rate Limiting
- Configurable requests per minute
- Per-API-key rate limiting

### 3. Usage Quotas
- Monthly spending limits
- Automatic usage tracking
- Usage reset on monthly cycle

### 4. Row Level Security (RLS)
- Users can only access their own API keys
- Users can only manage their own webhooks
- Service role bypass for admin operations

### 5. Webhook Security
- HMAC-SHA256 signatures
- Secret-based verification
- Retry with exponential backoff

---

## Developer Dashboard Features

### 1. API Keys Management
- Create new API keys
- View existing keys
- Activate/deactivate keys
- Delete keys
- Copy API key and secret

### 2. Webhooks Management
- Add new webhooks
- Configure webhook URL
- Select events to subscribe
- Activate/deactivate webhooks
- View delivery logs

### 3. Usage Statistics
- Monthly usage amount
- API key usage breakdown
- Webhook delivery success rate

---

## File Structure

```
tada-vtu/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── airtime/
│   │   │       │   └── buy/route.ts       # Airtime purchase endpoint
│   │   │       ├── data/
│   │   │       │   ├── buy/route.ts       # Data purchase endpoint
│   │   │       │   └── plans/route.ts     # Data plans endpoint
│   │   │       └── wallet/
│   │   │           └── balance/route.ts   # Balance check endpoint
│   │   └── dashboard/
│   │       └── developer/
│   │           └── page.tsx               # Developer dashboard UI
│   └── lib/
│       └── api/
│           ├── reseller-auth.ts           # API key validation
│           ├── webhooks.ts               # Webhook delivery system
│           ├── inlomax.ts                # VTU provider integration
│           └── merged-data-plans.ts       # Data plan management
├── scripts/
│   └── add-reseller-api-keys.sql         # Database migration
└── docs/
    └── RESELLER_API.md                   # API documentation
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid API key |
| 403 | Forbidden - API key inactive |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limits

| Plan | Requests/Minute | Monthly Limit |
|------|-----------------|---------------|
| Default | 60 | ₦100,000 |

---

## Best Practices for Developers

1. **Store credentials securely** - Never expose API keys in client-side code
2. **Implement webhooks** - Subscribe to transaction events for real-time updates
3. **Handle errors gracefully** - Implement retry logic for failed transactions
4. **Monitor usage** - Keep track of monthly limits to avoid service interruption
5. **Verify webhooks** - Always verify webhook signatures for security

---

## Support

For issues or questions:
- Email: support@tada.ng
- Documentation: /docs/RESELLER_API.md
