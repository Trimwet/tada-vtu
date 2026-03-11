# TADA VTU API Documentation

Welcome to the TADA VTU API. This documentation helps developers integrate with our platform to resell data, airtime, cable TV, and more.

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
GET /inlomax/data-plans
```

**Response:**
```json
{
  "status": true,
  "data": {
    "mtn": [
      { "id": "mtn-1gb", "size": "1GB", "price": 350, "validity": "30 days" }
    ],
    "airtel": [...],
    "glo": [...],
    "9mobile": [...]
  }
}
```

---

### 2. Purchase Data

```http
POST /inlomax/data
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
  "planId": "mtn-1gb",
  "amount": 350
}
```

**Response:**
```json
{
  "status": true,
  "message": "Data purchased successfully",
  "data": {
    "reference": "TXN_123456",
    "network": "mtn",
    "phone": "08012345678",
    "amount": 350,
    "plan": "1GB"
  }
}
```

---

### 3. Purchase Airtime

```http
POST /inlomax/airtime
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
  "message": "Airtime purchased successfully",
  "data": {
    "reference": "TXN_123456",
    "network": "mtn",
    "phone": "08012345678",
    "amount": 1000
  }
}
```

---

### 6. Check Transaction Status

```http
GET /inlomax/transaction/{reference}
```

**Response:**
```json
{
  "status": true,
  "data": {
    "reference": "TXN_123456",
    "status": "success",
    "network": "mtn",
    "phone": "08012345678",
    "amount": 350
  }
}
```

---

### 7. Get Wallet Balance

```http
GET /inlomax/balance
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

## Webhooks

Receive real-time updates when transactions complete.

### Endpoint
```http
POST /inlomax/webhook
```

### Webhook Payload (Data)
```json
{
  "event": "transaction.completed",
  "reference": "TXN_123456",
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
  "reference": "TXN_123456",
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
async function buyData(token, network, phone, planId, amount) {
  const response = await fetch(`${API_URL}/inlomax/data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ network, phone, planId, amount })
  });
  return response.json();
}
```

### Python

```python
import requests

API_URL = 'https://www.tadavtu.com/api'

def buy_data(token, network, phone, plan_id, amount):
    response = requests.post(
        f'{API_URL}/inlomax/data',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        },
        json={
            'network': network,
            'phone': phone,
            'planId': plan_id,
            'amount': amount
        }
    )
    return response.json()
```

### PHP

```php
<?php
$url = 'https://www.tadavtu.com/api/inlomax/data';
$data = [
    'network' => 'mtn',
    'phone' => '08012345678',
    'planId' => 'mtn-1gb',
    'amount' => 350
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
