# TADA VTU Reseller API Documentation

## Overview

The TADA VTU Reseller API allows you to integrate our VTU services into your own applications. You can purchase airtime and data bundles programmatically for your customers.

**Base URL:** `https://tadavtu.com/api/reseller`

## Authentication

All API requests require authentication using API Key and Secret in the request headers.

```http
X-API-Key: your_api_key_here
X-API-Secret: your_api_secret_here
Content-Type: application/json
```

### Getting Your API Credentials

1. Log in to your TADA VTU dashboard
2. Navigate to Developer API section
3. Click "Create API Key"
4. Give it a descriptive name
5. Copy both the API Key and Secret (Secret is only shown once!)

## Rate Limits

- **60 requests per minute** per API key
- **₦100,000 monthly transaction limit** (default, can be increased)
- Rate limit headers are included in all responses:
  - `X-RateLimit-Limit`: Maximum requests per minute
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Endpoints

### 1. Check Balance

Get your current wallet balance.

**Endpoint:** `GET /balance`

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 50000.00,
    "currency": "NGN"
  }
}
```

---

### 2. Buy Airtime

Purchase airtime for any Nigerian phone number.

**Endpoint:** `POST /airtime`

**Request Body:**
```json
{
  "network": "MTN",
  "phone": "08012345678",
  "amount": 100,
  "reference": "your_unique_reference"
}
```

**Parameters:**
- `network` (required): Network provider - `MTN`, `AIRTEL`, `GLO`, or `9MOBILE`
- `phone` (required): Recipient phone number (11 digits)
- `amount` (required): Amount in Naira (minimum: ₦50, maximum: ₦50,000)
- `reference` (optional): Your unique transaction reference for idempotency

**Response:**
```json
{
  "success": true,
  "message": "Airtime purchase successful",
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "reference": "your_unique_reference",
    "network": "MTN",
    "phone": "08012345678",
    "amount": 100,
    "status": "success",
    "balance_before": 50000.00,
    "balance_after": 49900.00,
    "created_at": "2024-03-11T10:30:00Z"
  }
}
```

---

### 3. Get Data Plans

Retrieve available data plans for a specific network.

**Endpoint:** `GET /data/plans?network={NETWORK}`

**Parameters:**
- `network` (required): Network provider - `MTN`, `AIRTEL`, `GLO`, or `9MOBILE`

**Response:**
```json
{
  "success": true,
  "data": {
    "network": "MTN",
    "plans": [
      {
        "plan_id": "mtn_1gb_30days",
        "name": "1GB - 30 Days",
        "size": "1GB",
        "validity": "30 Days",
        "price": 280.00,
        "category": "SME"
      },
      {
        "plan_id": "mtn_2gb_30days",
        "name": "2GB - 30 Days",
        "size": "2GB",
        "validity": "30 Days",
        "price": 560.00,
        "category": "SME"
      }
    ]
  }
}
```

---

### 4. Buy Data

Purchase data bundle for any Nigerian phone number.

**Endpoint:** `POST /data`

**Request Body:**
```json
{
  "network": "MTN",
  "phone": "08012345678",
  "plan_id": "mtn_1gb_30days",
  "reference": "your_unique_reference"
}
```

**Parameters:**
- `network` (required): Network provider - `MTN`, `AIRTEL`, `GLO`, or `9MOBILE`
- `phone` (required): Recipient phone number (11 digits)
- `plan_id` (required): Data plan ID from the plans endpoint
- `reference` (optional): Your unique transaction reference for idempotency

**Response:**
```json
{
  "success": true,
  "message": "Data purchase successful",
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440001",
    "reference": "your_unique_reference",
    "network": "MTN",
    "phone": "08012345678",
    "plan": "1GB - 30 Days",
    "amount": 280.00,
    "status": "success",
    "balance_before": 49900.00,
    "balance_after": 49620.00,
    "created_at": "2024-03-11T10:35:00Z"
  }
}
```

---

### 5. Verify Transaction

Check the status of a transaction.

**Endpoint:** `GET /transaction/{transaction_id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "reference": "your_unique_reference",
    "type": "airtime",
    "network": "MTN",
    "phone": "08012345678",
    "amount": 100,
    "status": "success",
    "created_at": "2024-03-11T10:30:00Z",
    "completed_at": "2024-03-11T10:30:05Z"
  }
}
```

**Status Values:**
- `pending`: Transaction is being processed
- `success`: Transaction completed successfully
- `failed`: Transaction failed

---

### 6. Transaction History

Get your transaction history with pagination.

**Endpoint:** `GET /transactions?page={page}&limit={limit}&status={status}`

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status - `success`, `pending`, or `failed`

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "airtime",
        "network": "MTN",
        "phone": "08012345678",
        "amount": 100,
        "status": "success",
        "created_at": "2024-03-11T10:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 100,
      "items_per_page": 20
    }
  }
}
```

---

## Webhooks

Webhooks allow you to receive real-time notifications when transactions are completed or failed.

### Setting Up Webhooks

1. Go to Developer API section in your dashboard
2. Click "Add Webhook"
3. Enter your webhook URL (must be HTTPS)
4. Select events to subscribe to

### Webhook Events

- `transaction.completed`: Sent when a transaction succeeds
- `transaction.failed`: Sent when a transaction fails

### Webhook Payload

```json
{
  "event": "transaction.completed",
  "timestamp": "2024-03-11T10:30:05Z",
  "data": {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "reference": "your_unique_reference",
    "type": "airtime",
    "network": "MTN",
    "phone": "08012345678",
    "amount": 100,
    "status": "success",
    "created_at": "2024-03-11T10:30:00Z",
    "completed_at": "2024-03-11T10:30:05Z"
  }
}
```

### Webhook Security

All webhook requests include a signature in the `X-Webhook-Signature` header. Verify this signature to ensure the request is from TADA VTU.

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}
```

### Webhook Response

Your endpoint should respond with a `200 OK` status within 5 seconds. If we don't receive a successful response, we'll retry:
- After 1 minute
- After 5 minutes
- After 15 minutes
- After 1 hour

After 4 failed attempts, the webhook will be marked as failed.

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance to complete this transaction"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | API key is invalid or inactive |
| `INVALID_API_SECRET` | API secret is incorrect |
| `RATE_LIMIT_EXCEEDED` | Too many requests, slow down |
| `INSUFFICIENT_BALANCE` | Not enough balance in wallet |
| `INVALID_NETWORK` | Network provider not supported |
| `INVALID_PHONE` | Phone number format is invalid |
| `INVALID_AMOUNT` | Amount is below minimum or above maximum |
| `INVALID_PLAN` | Data plan ID not found |
| `DUPLICATE_REFERENCE` | Reference already used |
| `MONTHLY_LIMIT_EXCEEDED` | Monthly transaction limit reached |
| `SERVICE_UNAVAILABLE` | VTU service temporarily unavailable |

---

## Best Practices

### 1. Idempotency

Always include a unique `reference` in your requests to prevent duplicate transactions. If you retry a request with the same reference, you'll get the original transaction result.

### 2. Error Handling

Implement proper error handling and retry logic:
- For `SERVICE_UNAVAILABLE`, retry after a few seconds
- For `RATE_LIMIT_EXCEEDED`, implement exponential backoff
- For `INSUFFICIENT_BALANCE`, notify your admin to fund the wallet

### 3. Webhook Reliability

- Respond quickly (within 5 seconds)
- Process webhooks asynchronously
- Verify webhook signatures
- Handle duplicate webhooks (use transaction_id for deduplication)

### 4. Security

- Never expose your API Secret in client-side code
- Store credentials securely (environment variables, secrets manager)
- Use HTTPS for all API calls
- Rotate API keys periodically

### 5. Testing

Test your integration thoroughly:
- Test with small amounts first
- Test all error scenarios
- Test webhook handling
- Monitor your first few live transactions closely

---

## Code Examples

### Node.js Example

```javascript
const axios = require('axios');

const TADA_API_KEY = process.env.TADA_API_KEY;
const TADA_API_SECRET = process.env.TADA_API_SECRET;
const BASE_URL = 'https://tadavtu.com/api/reseller';

async function buyAirtime(network, phone, amount) {
  try {
    const response = await axios.post(
      `${BASE_URL}/airtime`,
      {
        network,
        phone,
        amount,
        reference: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      {
        headers: {
          'X-API-Key': TADA_API_KEY,
          'X-API-Secret': TADA_API_SECRET,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
buyAirtime('MTN', '08012345678', 100)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Failed:', error));
```

### PHP Example

```php
<?php

$apiKey = getenv('TADA_API_KEY');
$apiSecret = getenv('TADA_API_SECRET');
$baseUrl = 'https://tadavtu.com/api/reseller';

function buyAirtime($network, $phone, $amount) {
    global $apiKey, $apiSecret, $baseUrl;
    
    $data = [
        'network' => $network,
        'phone' => $phone,
        'amount' => $amount,
        'reference' => 'txn_' . time() . '_' . bin2hex(random_bytes(4))
    ];
    
    $ch = curl_init("$baseUrl/airtime");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Key: ' . $apiKey,
        'X-API-Secret: ' . $apiSecret,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Usage
$result = buyAirtime('MTN', '08012345678', 100);
print_r($result);
```

### Python Example

```python
import requests
import os
import time
import random
import string

API_KEY = os.getenv('TADA_API_KEY')
API_SECRET = os.getenv('TADA_API_SECRET')
BASE_URL = 'https://tadavtu.com/api/reseller'

def buy_airtime(network, phone, amount):
    reference = f"txn_{int(time.time())}_{random_string(8)}"
    
    response = requests.post(
        f'{BASE_URL}/airtime',
        json={
            'network': network,
            'phone': phone,
            'amount': amount,
            'reference': reference
        },
        headers={
            'X-API-Key': API_KEY,
            'X-API-Secret': API_SECRET,
            'Content-Type': 'application/json'
        }
    )
    
    return response.json()

def random_string(length):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# Usage
result = buy_airtime('MTN', '08012345678', 100)
print(result)
```

---

## Support

Need help? Contact us:

- **Email:** developer@tadavtu.com
- **WhatsApp:** +234 XXX XXX XXXX
- **Dashboard:** [https://tadavtu.com/dashboard/developer](https://tadavtu.com/dashboard/developer)

---

## Changelog

### Version 1.0.0 (March 2024)
- Initial API release
- Airtime and Data purchase endpoints
- Webhook support
- Transaction history and verification
