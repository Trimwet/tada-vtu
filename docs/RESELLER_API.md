# TADA VTU API Documentation

Welcome to the TADA VTU Reseller API. This documentation helps developers integrate with our platform to resell data and airtime.

---

## Base URL

```
Production: https://www.tadavtu.com/api
```

---

## Authentication

All API requests require authentication via Supabase. Include the user's JWT token in the Authorization header:

```http
Authorization: Bearer <USER_JWT_TOKEN>
```

### Getting Started

1. **Register** at [tadavtu.com](https://www.tadavtu.com)
2. **Login** to get your JWT token
3. **Fund wallet** to have balance for transactions

---

## Available Services

| Service | Description |
|---------|-------------|
| Data | Purchase mobile data plans for MTN, Airtel, Glo, 9mobile |
| Airtime | Purchase airtime credit for all networks |

---

## Endpoints

### 1. Get Data Plans

Get available data plans for all networks.

```http
GET /data/plans?network=MTN
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
POST /data/buy
```

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <TOKEN>
```

**Request Body:**
```json
{
  "network": "mtn",
  "phone": "08012345678",
  "planId": "mtn-sme-1gb",
  "planName": "1GB",
  "amount": 350,
  "userId": "user-uuid-here",
  "pin": "1234"
}
```

**Response:**
```json
{
  "status": true,
  "message": "1GB sent to 08012345678 successfully!",
  "data": {
    "reference": "TADA_DATA_1234567890_abc123",
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
POST /airtime/buy
```

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <TOKEN>
```

**Request Body:**
```json
{
  "network": "mtn",
  "phone": "08012345678",
  "amount": 1000,
  "userId": "user-uuid-here"
}
```

**Response:**
```json
{
  "status": true,
  "message": "₦1000 airtime sent to 08012345678 successfully!",
  "data": {
    "reference": "TADA_AIR_1234567890_xyz789",
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
GET /wallet/balance?userId=USER_UUID
```

**Response:**
```json
{
  "status": true,
  "data": {
    "balance": 5000,
    "currency": "NGN"
  }
}
```

---

### 5. Check Transaction Status

```http
GET /transaction/{reference}
```

**Response:**
```json
{
  "status": true,
  "data": {
    "reference": "TADA_DATA_1234567890_abc123",
    "status": "success",
    "type": "data",
    "amount": 350,
    "phone": "08012345678",
    "network": "MTN",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

---

## Webhooks

Receive real-time updates when transactions complete.

### Endpoint
```http
POST /webhooks/tada
```

### Webhook Payload (Data)
```json
{
  "event": "transaction.completed",
  "reference": "TADA_DATA_1234567890_abc123",
  "status": "success",
  "type": "data",
  "network": "mtn",
  "phone": "08012345678",
  "amount": 350,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Webhook Payload (Airtime)
```json
{
  "event": "transaction.completed",
  "reference": "TADA_AIR_1234567890_xyz789",
  "status": "success",
  "type": "airtime",
  "network": "mtn",
  "phone": "08012345678",
  "amount": 1000,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request |
| 401 | Unauthorized |
| 404 | Not found |
| 429 | Rate limited |
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
  "message": "Network not supported"
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

// Purchase Data
async function buyData(token, network, phone, planId, planName, amount, userId, pin) {
  const response = await fetch(`${API_URL}/data/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ network, phone, planId, planName, amount, userId, pin })
  });
  return response.json();
}

// Get Data Plans
async function getDataPlans(token, network) {
  const response = await fetch(`${API_URL}/data/plans?network=${network}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

// Purchase Airtime
async function buyAirtime(token, network, phone, amount, userId) {
  const response = await fetch(`${API_URL}/airtime/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ network, phone, amount, userId })
  });
  return response.json();
}

// Check Balance
async function getBalance(token, userId) {
  const response = await fetch(`${API_URL}/wallet/balance?userId=${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}
```

### Python

```python
import requests

API_URL = 'https://www.tadavtu.com/api'

def buy_data(token, network, phone, plan_id, plan_name, amount, user_id, pin):
    response = requests.post(
        f'{API_URL}/data/buy',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        },
        json={
            'network': network,
            'phone': phone,
            'planId': plan_id,
            'planName': plan_name,
            'amount': amount,
            'userId': user_id,
            'pin': pin
        }
    )
    return response.json()

def get_data_plans(token, network):
    response = requests.get(
        f'{API_URL}/data/plans',
        params={'network': network},
        headers={'Authorization': f'Bearer {token}'}
    )
    return response.json()

def buy_airtime(token, network, phone, amount, user_id):
    response = requests.post(
        f'{API_URL}/airtime/buy',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        },
        json={
            'network': network,
            'phone': phone,
            'amount': amount,
            'userId': user_id
        }
    )
    return response.json()
```

### PHP

```php
<?php
// Purchase Data
$url = 'https://www.tadavtu.com/api/data/buy';
$data = [
    'network' => 'mtn',
    'phone' => '08012345678',
    'planId' => 'mtn-sme-1gb',
    'planName' => '1GB',
    'amount' => 350,
    'userId' => 'user-uuid-here',
    'pin' => '1234'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);
$response = curl_exec($ch);
?>
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
