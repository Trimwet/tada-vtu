# Inlomax vs SMEPlug.ng - VTU Provider Comparison

## Executive Summary

| Feature | Inlomax | SMEPlug.ng | Winner |
|---------|---------|------------|--------|
| **API Simplicity** | Simple REST API | Simple REST API | Tie |
| **Authentication** | Token-based | Bearer Token | Tie |
| **Data Plans** | Basic | More variety | SMEPlug |
| **Bank Transfers** | ❌ No | ✅ Yes | SMEPlug |
| **Webhooks** | ❌ No | ✅ Yes | SMEPlug |
| **Transaction History API** | Basic | Advanced with filters | SMEPlug |
| **Device Management** | ❌ No | ✅ Yes | SMEPlug |
| **SIM-based Automation** | ❌ No | ✅ Yes | SMEPlug |
| **Corporate Gifting** | Basic | Advanced | SMEPlug |
| **Staff/Reseller System** | ❌ No | ✅ Yes | SMEPlug |
| **Virtual Accounts** | ❌ No | ✅ Yes | SMEPlug |
| **Rate Limiting Info** | Not documented | 100 req/min | SMEPlug |

---

## Detailed Comparison

### 1. API Structure

#### Inlomax
```
Base URL: https://inlomax.com/api
Auth: Authorization: Token {{API_KEY}}
```

**Endpoints:**
- `GET /balance` - Wallet balance
- `GET /services` - All services & pricing
- `POST /airtime` - Buy airtime
- `POST /data` - Buy data
- `POST /validatecable` - Validate IUC
- `POST /subcable` - Buy cable subscription
- `POST /validatemeter` - Validate meter
- `POST /payelectric` - Pay electricity
- `POST /transaction` - Verify transaction

#### SMEPlug.ng
```
Base URL: https://smeplug.ng/api/v1
Auth: Authorization: Bearer {{SECRET_KEY}}
```

**Endpoints:**
- `GET /account/balance` - Wallet balance
- `GET /networks` - Available networks
- `GET /data/plans` - Data plans
- `POST /data/purchase` - Buy data
- `POST /airtime/purchase` - Buy airtime
- `POST /vtu/topup` - VTU/Share & Sell
- `GET /banks` - Bank list
- `POST /bank/resolve` - Verify account
- `POST /bank/transfer` - Bank transfer
- `GET /transactions` - Transaction history
- `GET /devices` - Connected devices

---

### 2. Services Comparison

| Service | Inlomax | SMEPlug.ng |
|---------|---------|------------|
| Airtime (MTN, Airtel, Glo, 9mobile) | ✅ | ✅ |
| Data Plans | ✅ | ✅ |
| Cable TV (DStv, GOtv, Startimes) | ✅ | ❓ Not in API docs |
| Electricity | ✅ | ❓ Not in API docs |
| Education (WAEC, JAMB) | ✅ | ❓ Not in API docs |
| Bank Transfers | ❌ | ✅ |
| VTU/Share & Sell | ❌ | ✅ |
| Device-based Dispensing | ❌ | ✅ |
| SIM-based Automation | ❌ | ✅ |

---

### 3. Data Plan Types

#### Inlomax Data Types:
- SME
- SME SHARE
- CORPORATE GIFTING
- GIFTING
- AWOOF
- DIRECT
- SOCIAL

#### SMEPlug.ng Data Types:
- SME
- Corporate
- Gifting
- Data Share
- MoMo Awoof (MTN only)
- Airtime conversion

---

### 4. Unique SMEPlug Features (Not in Inlomax)

#### 🏦 Bank Transfer System
```javascript
// Resolve account
POST /bank/resolve
{ bank_code: "044", account_number: "1234567890" }

// Transfer funds
POST /bank/transfer
{ bank_code: "044", account_number: "1234567890", amount: "5000" }
```
**Use Case:** Allow users to withdraw to bank accounts directly

#### 🔔 Webhook Integration
```json
{
  "transaction": {
    "status": "success",
    "reference": "46634e8384c7c68f5baa",
    "customer_reference": "38dhdhdsk",
    "type": "Data purchase",
    "beneficiary": "090XXXXXXXX",
    "price": "200"
  }
}
```
**Use Case:** Real-time transaction status updates without polling

#### 📱 Device Management
- Connect physical devices (phones/tablets)
- Device-based data dispensing
- Bulk device operations
- Failover configurations

#### 👥 Staff/Reseller System
- Create sub-accounts
- Role-based access control
- Commission tracking
- Reseller program management

#### 💳 Virtual Accounts
- Generate virtual bank accounts
- Automated funding
- Enhanced payment processing

#### 📊 Advanced Transaction History
```javascript
GET /transactions?type=data&status=success&start_date=2024-01-01&page=1
```
- Filter by type, status, date range
- Pagination support
- Detailed transaction logs

---

### 5. Network ID Mapping

| Network | Inlomax ServiceID | SMEPlug Network ID |
|---------|-------------------|-------------------|
| MTN | 1 | 1 |
| Airtel | 2 | 2 |
| 9Mobile | 4 | 3 |
| Glo | 3 | 4 |

⚠️ **Note:** 9Mobile and Glo IDs are swapped between providers!

---

### 6. Response Format Comparison

#### Inlomax Success Response:
```json
{
  "status": "success",
  "message": "Transaction successful",
  "data": {
    "reference": "INL123456",
    "amount": 500,
    "network": "MTN"
  }
}
```

#### SMEPlug Success Response:
```json
{
  "status": true,
  "message": "Data purchase successful",
  "reference": "46634e8384c7c68f5baa",
  "customer_reference": "38dhdhdsk"
}
```

**Key Difference:** Inlomax uses `"success"/"failed"` strings, SMEPlug uses `true/false` booleans.

---

## Features TADA VTU Could Add with SMEPlug

### 1. 💸 Bank Withdrawals (Direct)
Currently using Flutterwave. SMEPlug offers direct bank transfers.

### 2. 🔔 Real-time Webhooks
Get instant transaction status updates instead of polling.

### 3. 📱 VTU/Share & Sell
Additional data delivery method for better rates.

### 4. 👥 Reseller System
Allow users to become sub-resellers with their own customers.

### 5. 💳 Virtual Account Funding
Generate unique virtual accounts for each user for easy funding.

### 6. 📊 Better Transaction Tracking
Advanced filtering and pagination for transaction history.

---

## Implementation Recommendation

### Option A: Replace Inlomax with SMEPlug
**Pros:**
- More features (bank transfers, webhooks, devices)
- Better API documentation
- Modern API design

**Cons:**
- Migration effort
- Need to test all services
- May lose cable/electricity if not in SMEPlug API

### Option B: Use Both Providers (Recommended)
**Strategy:**
- **Inlomax:** Cable TV, Electricity, Education
- **SMEPlug:** Data, Airtime, Bank Transfers, Webhooks

**Benefits:**
- Redundancy/failover
- Best of both worlds
- No service disruption

### Option C: SMEPlug as Primary, Inlomax as Fallback
**Strategy:**
- Use SMEPlug for all services
- Fall back to Inlomax if SMEPlug fails
- Automatic provider switching

---

## Quick Implementation: SMEPlug API Client

```typescript
// tada-vtu/src/lib/api/smeplug.ts

const SMEPLUG_API_URL = 'https://smeplug.ng/api/v1';

export const SMEPLUG_NETWORK_IDS: Record<string, string> = {
  MTN: '1',
  AIRTEL: '2',
  '9MOBILE': '3',
  GLO: '4',
};

interface SMEPlugResponse<T = unknown> {
  status: boolean;
  message?: string;
  reference?: string;
  customer_reference?: string;
  data?: T;
}

export async function smeplugRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  data?: Record<string, unknown>
): Promise<SMEPlugResponse<T>> {
  const apiKey = process.env.SMEPLUG_API_KEY;

  if (!apiKey) {
    throw new Error('SMEPLUG_API_KEY is not configured');
  }

  const response = await fetch(`${SMEPLUG_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: method === 'POST' && data ? JSON.stringify(data) : undefined,
  });

  const result = await response.json();

  if (!response.ok || !result.status) {
    throw new Error(result.message || 'SMEPlug API Error');
  }

  return result;
}

// Get wallet balance
export async function getBalance() {
  return smeplugRequest<{ balance: number }>('/account/balance');
}

// Get data plans
export async function getDataPlans() {
  return smeplugRequest<Record<string, Array<{
    id: string;
    name: string;
    price: string;
  }>>>('/data/plans');
}

// Purchase data
export async function purchaseData(data: {
  network: string;
  plan: string;
  phone: string;
  reference: string;
}) {
  return smeplugRequest('/data/purchase', 'POST', {
    network: SMEPLUG_NETWORK_IDS[data.network.toUpperCase()] || '1',
    plan: data.plan,
    phone: data.phone,
    customer_reference: data.reference,
  });
}

// Purchase airtime
export async function purchaseAirtime(data: {
  network: string;
  amount: number;
  phone: string;
  reference: string;
}) {
  return smeplugRequest('/airtime/purchase', 'POST', {
    network: SMEPLUG_NETWORK_IDS[data.network.toUpperCase()] || '1',
    amount: data.amount.toString(),
    phone: data.phone,
    customer_reference: data.reference,
  });
}

// Bank transfer
export async function bankTransfer(data: {
  bankCode: string;
  accountNumber: string;
  amount: number;
  reference: string;
}) {
  return smeplugRequest('/bank/transfer', 'POST', {
    bank_code: data.bankCode,
    account_number: data.accountNumber,
    amount: data.amount.toString(),
    customer_reference: data.reference,
  });
}

// Resolve bank account
export async function resolveAccount(data: {
  bankCode: string;
  accountNumber: string;
}) {
  return smeplugRequest<{
    account_name: string;
    account_number: string;
  }>('/bank/resolve', 'POST', {
    bank_code: data.bankCode,
    account_number: data.accountNumber,
  });
}

// Get banks list
export async function getBanks() {
  return smeplugRequest<Array<{
    id: string;
    name: string;
    code: string;
  }>>('/banks');
}

// Get transaction history
export async function getTransactions(params?: {
  type?: 'data' | 'airtime' | 'transfer';
  status?: 'success' | 'failed' | 'pending';
  startDate?: string;
  endDate?: string;
  page?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.startDate) queryParams.append('start_date', params.startDate);
  if (params?.endDate) queryParams.append('end_date', params.endDate);
  if (params?.page) queryParams.append('page', params.page.toString());

  const query = queryParams.toString();
  return smeplugRequest(`/transactions${query ? `?${query}` : ''}`);
}
```

---

## Environment Variables to Add

```env
# SMEPlug API
SMEPLUG_API_KEY=your_smeplug_secret_key
SMEPLUG_WEBHOOK_SECRET=your_webhook_secret
```

---

## Conclusion

**SMEPlug.ng offers significantly more features** than Inlomax, especially:
- Bank transfers (huge for withdrawals)
- Webhooks (real-time updates)
- Device/SIM automation
- Reseller system
- Virtual accounts

**Recommendation:** Integrate SMEPlug as a secondary provider, then gradually migrate services that perform better on SMEPlug while keeping Inlomax for cable TV and electricity.
