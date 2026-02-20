#!/usr/bin/env node
/**
 * Test the pricing endpoint
 */

const https = require('https');

const BASE_URL = 'https://www.tadavtu.com';
const API_KEY = process.env.OPENCLAW_API_KEY || 'oc_tada_2024_secure_key_change_in_production';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    console.log('Testing:', BASE_URL + path);
    console.log('Headers:', options.headers);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\nStatus:', res.statusCode);
        console.log('Response:', data);
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.end();
  });
}

async function test() {
  console.log('🧪 Testing OpenClaw Pricing Endpoint\n');
  
  try {
    const result = await makeRequest('/api/openclaw/pricing?network=MTN');
    
    if (result.status === 200 && result.data.success) {
      console.log('\n✅ SUCCESS!');
      console.log('Plans available:', result.data.plans?.length || 0);
      if (result.data.plans && result.data.plans.length > 0) {
        console.log('\nFirst 3 plans:');
        result.data.plans.slice(0, 3).forEach((plan, i) => {
          console.log(`${i + 1}. ${plan.name} - ₦${plan.price} (${plan.validity})`);
        });
      }
    } else {
      console.log('\n❌ FAILED');
      console.log('Error:', result.data);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

test();
