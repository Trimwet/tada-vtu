#!/usr/bin/env node

// Test webhook with your transfer data
const https = require('https');

const webhookData = {
  event: "charge.completed",
  data: {
    id: 12345678,
    tx_ref: "TADA-VA-242e2d27-1766931838",
    flw_ref: "FLW-MOCK-" + Date.now(),
    amount: 200,
    currency: "NGN",
    payment_type: "bank_transfer",
    status: "successful",
    virtual_account_number: "8817928367",
    account_number: "8817928367",
    customer: {
      email: "jonahmafuyai81@gmail.com",
      name: "JONAH TRIMWET MAFUYAI"
    },
    meta: {
      user_id: "242e2d27-6ca5-421e-b4cd-a6732da764a8"
    }
  }
};

const postData = JSON.stringify(webhookData);

const options = {
  hostname: 'www.tadavtu.com',
  port: 443,
  path: '/api/flutterwave/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'verif-hash': '8418a0f04d0f7455c4e31b5e',
    'User-Agent': 'Flutterwave-Webhook/1.0'
  }
};

console.log('🧪 Testing webhook with your transfer data...');
console.log('Webhook URL:', `https://${options.hostname}${options.path}`);
console.log('Transfer Amount: ₦200');
console.log('Account Number: 8817928367');

const req = https.request(options, (res) => {
  console.log(`\n📡 Response Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📋 Response:', response);
      
      if (response.status === 'success') {
        console.log('✅ Webhook test successful! The issue is likely that Flutterwave isn\'t sending webhooks.');
      } else {
        console.log('❌ Webhook test failed:', response.message);
      }
    } catch (e) {
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Webhook test failed:', e.message);
});

req.write(postData);
req.end();