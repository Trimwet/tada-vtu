#!/usr/bin/env node

// Test webhook accessibility from different sources
const https = require('https');

console.log('🧪 Testing webhook accessibility from different sources...\n');

const webhookUrl = 'https://www.tadavtu.com/api/flutterwave/webhook';

// Test 1: Direct access (our current test)
console.log('1. Testing direct access (our IP):');
testWebhook('Direct Access', webhookUrl);

// Test 2: Simulate Flutterwave webhook call
console.log('\n2. Testing simulated Flutterwave webhook:');
const flutterwavePayload = {
  event: "charge.completed",
  data: {
    id: 12345,
    tx_ref: "TEST-WEBHOOK-ACCESS",
    flw_ref: "FLW-TEST-" + Date.now(),
    amount: 100,
    currency: "NGN",
    payment_type: "bank_transfer",
    status: "successful",
    account_number: "8817928367",
    customer: {
      email: "test@example.com",
      name: "Test User"
    }
  }
};

testWebhookPost('Flutterwave Simulation', webhookUrl, flutterwavePayload);

function testWebhook(testName, url) {
  const urlObj = new URL(url);
  
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname,
    method: 'GET',
    headers: {
      'User-Agent': 'Webhook-Test/1.0'
    }
  };

  const req = https.request(options, (res) => {
    console.log(`   ${testName}: ${res.statusCode} ${res.statusMessage}`);
    
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log(`   Response: ${response.message || 'OK'}`);
      } catch (e) {
        console.log(`   Response: ${data.substring(0, 100)}...`);
      }
    });
  });

  req.on('error', (e) => {
    console.log(`   ${testName}: ERROR - ${e.message}`);
  });

  req.end();
}

function testWebhookPost(testName, url, payload) {
  const urlObj = new URL(url);
  const postData = JSON.stringify(payload);
  
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Flutterwave-Webhook/1.0',
      'verif-hash': '8418a0f04d0f7455c4e31b5e' // Your webhook secret
    }
  };

  const req = https.request(options, (res) => {
    console.log(`   ${testName}: ${res.statusCode} ${res.statusMessage}`);
    
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log(`   Response: ${response.message || response.status || 'OK'}`);
      } catch (e) {
        console.log(`   Response: ${data.substring(0, 100)}...`);
      }
    });
  });

  req.on('error', (e) => {
    console.log(`   ${testName}: ERROR - ${e.message}`);
  });

  req.write(postData);
  req.end();
}

console.log('\n💡 What to look for:');
console.log('- If both tests work: Issue is likely Flutterwave IP whitelist');
console.log('- If POST fails but GET works: Issue might be Vercel firewall');
console.log('- If both fail: Issue is network/DNS related');
console.log('- If both work: Issue is elsewhere (timing, headers, etc.)');