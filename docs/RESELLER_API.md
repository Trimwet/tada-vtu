# TADA VTU Reseller API Documentation

Welcome to the TADA VTU Reseller API. This documentation helps developers integrate with our platform to resell data and airtime.

---

## Base URL

```
Production: https://www.tadavtu.com/api
```

---

## Authentication

### Option 1: API Key (Recommended)

The easiest way to authenticate - just include your API key in the headers:

```http
X-API-Key: tada_live_xxxxxxxxxxxxx
X-API-Secret: your_api_secret (optional but recommended)
```

### Option 2: JWT Token

You can also use Supabase JWT tokens:

```http
Authorization: Bearer <USER_JWT_TOKEN>
```

### Getting Started (API Key)

1. **Register** at [tadavtu.com](https://www.tadavtu.com)
2. **Login** to your dashboard
3. **Go to API Settings** to generate your API key
4. **Fund wallet** to have balance for transactions
5. **Make API calls** using your API key

---

## Available Services

| Service | Description |
|---------|-------------|
| Data | Purchase mobile data plans for MTN, Airtel, Glo, 9mobile |
| Airtime | Purchase airtime credit for all networks |

---

## Endpoints (v1 - API Key Auth)

### 1. Get Data Plans

Get available data plans for all networks.

```http
GET /v1/data/plans?network=MTN
```

**Headers:**
```http
X-API-Key: tada_live_xxxxxxxxxxxxx
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | Yes | Network name (MTN, AIRTEL, GLO, 9MOBILE) |

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "mtn-1gb",
      "serviceID": "mtn-sme-1gb",
      "name": "1GB",
      "size": "1GB",
      "price": 350,
      "validity": "30 days",
      "type": "sme",
      "network": "MTN"
    }
  ],
  "network": "MTN",
  "totalPlans": 10
}
```

---

### 2. Purchase Data

```http
POST /v1/data/buy
```

**Headers:**
```http
Content-Type: application/json
X-API-Key: tada_live_xxxxxxxxxxxxx
X-API-Secret: your_api_secret
```

**Request Body:**
```json
{
  "network": "mtn",
  "phone": "08012345678",
  "planId": "mtn-sme-1gb",
  "planName": "1GB",
  "amount": 350
}
```

**Response:**
```json
{
  "status": true,
  "message": "1GB sent to 08012345678 successfully!",
  "data": {
    "reference": "TADA_V1_DATA_1234567890_abc123",
    "network": "mtn",
    "phone": "08012345678",
    "dataPlan": "1GB",
    "amount": 350,
    "newBalance": 4650
  }
}
```

---

### 3. Purchase Airtime

```http
POST /v1/airtime/buy
```

**Headers:**
```http
Content-Type: application/json
X-API-Key: tada_live_xxxxxxxxxxxxx
X-API-Secret: your_api_secret
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
  "message": "₦1000 airtime sent to 08012345678 successfully!",
  "data": {
    "reference": "TADA_V1_AIR_1234567890_xyz789",
    "network": "mtn",
    "phone": "08012345678",
    "amount": 1000,
    "newBalance": 4000
  }
}
```

---

### 4. Check Wallet Balance

```http
GET /v1/wallet/balance
```

**Headers:**
```http
X-API-Key: tada_live_xxxxxxxxxxxxx
```

**Response:**
```json
{
  "status": true,
  "data": {
    "balance": 5000,
    "currency": "NGN",
    "apiKey": {
      "monthlyLimit": 100000,
      "monthlyUsage": 5000,
      "availableLimit": 95000
    }
  }
}
```

---

## Legacy Endpoints (JWT Auth)

These endpoints use Supabase JWT authentication (for backward compatibility):

| Endpoint | Description |
|----------|-------------|
| `/data/plans` | Get data plans |
| `/data/buy` | Purchase data |
| `/airtime/buy` | Purchase airtime |
| `/wallet/balance` | Check wallet balance |
| `/transaction/{ref}` | Check transaction status |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request |
| 401 | Unauthorized (invalid API key) |
| 403 | API key inactive or expired |
| 404 | Not found |
| 429 | Rate limit or monthly limit exceeded |
| 500 | Server error |

### Common Errors

```json
{
  "status": false,
  "message": "Insufficient balance"
}
```

```json
{
  "status": false,
  "message": "Invalid phone number"
}
```

```json
{
  "status": false,
  "message": "Monthly API key limit exceeded"
}
```

---

## Rate Limits

- **Data Plans**: 60 requests/minute
- **Purchases**: 30 requests/minute
- **Balance**: 120 requests/minute

---

## Code Examples

### JavaScript/Node.js

```javascript
const API_URL = 'https://www.tadavtu.com/api';
const API_KEY = 'tada_live_xxxxxxxxxxxxx';
const API_SECRET = 'your_api_secret';

// Purchase Data
async function buyData(network, phone, planId, planName, amount) {
  const response = await fetch(`${API_URL}/v1/data/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-API-Secret': API_SECRET
    },
    body: JSON.stringify({ network, phone, planId, planName, amount })
  });
  return response.json();
}

// Get Data Plans
async function getDataPlans(network) {
  const response = await fetch(`${API_URL}/v1/data/plans?network=${network}`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return response.json();
}

// Purchase Airtime
async function buyAirtime(network, phone, amount) {
  const response = await fetch(`${API_URL}/v1/airtime/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-API-Secret': API_SECRET
    },
    body: JSON.stringify({ network, phone, amount })
  });
  return response.json();
}

// Check Balance
async function getBalance() {
  const response = await fetch(`${API_URL}/v1/wallet/balance`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return response.json();
}
```

### Python

```python
import requests

API_URL = 'https://www.tadavtu.com/api'
API_KEY = 'tada_live_xxxxxxxxxxxxx'
API_SECRET = 'your_api_secret'

headers = {
    'X-API-Key': API_KEY,
    'X-API-Secret': API_SECRET
}

def buy_data(network, phone, plan_id, plan_name, amount):
    response = requests.post(
        f'{API_URL}/v1/data/buy',
        headers=headers,
        json={
            'network': network,
            'phone': phone,
            'planId': plan_id,
            'planName': plan_name,
            'amount': amount
        }
    )
    return response.json()

def get_data_plans(network):
    response = requests.get(
        f'{API_URL}/v1/data/plans',
        params={'network': network},
        headers={'X-API-Key': API_KEY}
    )
    return response.json()

def buy_airtime(network, phone, amount):
    response = requests.post(
        f'{API_URL}/v1/airtime/buy',
        headers=headers,
        json={'network': network, 'phone': phone, 'amount': amount}
    )
    return response.json()
```

---

## Support

- Email: support@tadavtu.com
- WhatsApp: [Contact Us](https://wa.me/234xxx)

---

## Terms

- Minimum transaction: ₦100
- All prices are in Naira (NGN)
- Transactions are final once processed
- API keys can be regenerated from dashboard
- Monthly usage limits apply to each API key
