#!/usr/bin/env node
/**
 * Test the complete OpenClaw flow
 */

const https = require('https');

const BASE_URL = 'https://www.tadavtu.com';
const API_KEY = 'oc_tada_2024_secure_key_change_in_production';
const TEST_PHONE = '09063546728';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testFlow() {
  console.log('🧪 Testing Complete OpenClaw Flow\n');
  
  // Step 1: Identify user
  console.log('1️⃣  Identifying user...');
  const identify = await makeRequest(`/api/openclaw/user/identify?whatsapp=${TEST_PHONE}`);
  
  if (identify.status !== 200 || !identify.data.success) {
    console.log('❌ User identification failed');
    console.log(identify.data);
    return;
  }
  
  console.log(`✅ User identified: ${identify.data.fullName}`);
  console.log(`   Balance: ₦${identify.data.balance}\n`);
  
  // Step 2: Get pricing
  console.log('2️⃣  Fetching MTN data plans...');
  const pricing = await makeRequest('/api/openclaw/pricing?network=MTN');
  
  if (pricing.status !== 200 || !pricing.data.success) {
    console.log('❌ Pricing fetch failed');
    console.log(pricing.data);
    return;
  }
  
  console.log(`✅ Found ${pricing.data.totalPlans} plans`);
  
  // Find 1GB 7-day plan
  const plan1GB = pricing.data.plans.find(p => 
    p.size === '1GB' && p.validity === '7 Days'
  );
  
  if (!plan1GB) {
    console.log('❌ 1GB 7-day plan not found');
    return;
  }
  
  console.log(`   Selected: ${plan1GB.name} - ₦${plan1GB.price}\n`);
  
  // Step 3: Create order
  console.log('3️⃣  Creating order...');
  const order = await makeRequest('/api/openclaw/orders/create', 'POST', {
    type: 'data',
    network: 'MTN',
    phoneNumber: TEST_PHONE,
    planId: plan1GB.id
  });
  
  if (order.status !== 200 || !order.data.success) {
    console.log('❌ Order creation failed');
    console.log(order.data);
    return;
  }
  
  console.log(`✅ Order created: ${order.data.orderId}`);
  console.log(`   Amount: ₦${order.data.amount}`);
  console.log(`   Plan: ${order.data.planName}\n`);
  
  console.log('🎉 All API endpoints working correctly!');
  console.log('\n📝 Next step: Configure your OpenClaw skill to use these endpoints');
}

testFlow().catch(console.error);
