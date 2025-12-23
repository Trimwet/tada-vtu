// Test SMEPlug API - User/Account endpoints
// Looking for virtual account details

const SMEPLUG_API_URL = 'https://smeplug.ng/api/v1';
const API_KEY = '563e262c80387b47d4301cfdfc182b72cfd747a8c3b3fb158fa77cba308147eb';

async function makeRequest(endpoint, method = 'GET', data = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${method} ${endpoint}`);
  console.log('='.repeat(60));
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${SMEPLUG_API_URL}${endpoint}`, options);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    
    try {
      const json = JSON.parse(text);
      console.log('Response:', JSON.stringify(json, null, 2));
      return json;
    } catch {
      console.log('Raw Response:', text.substring(0, 1000));
      return null;
    }
  } catch (error) {
    console.log('Error:', error.message);
    return null;
  }
}

async function testUserEndpoints() {
  console.log('\n🔍 SMEPLUG API - USER/ACCOUNT ENDPOINTS\n');
  
  // Try various user/account endpoints
  const endpoints = [
    '/user',
    '/user/profile',
    '/user/details',
    '/user/me',
    '/me',
    '/account',
    '/account/me',
    '/account/user',
    '/settings',
    '/user/settings',
    '/user/virtual-account',
    '/user/bank-details',
    '/user/funding-account',
    '/wallet',
    '/wallet/details',
    '/wallet/account',
    '/monnify',
    '/monnify/account',
    '/paystack',
    '/paystack/account',
    '/flutterwave',
    '/flutterwave/account',
  ];
  
  for (const endpoint of endpoints) {
    await makeRequest(endpoint);
  }
  
  console.log('\n\n✅ USER ENDPOINT EXPLORATION COMPLETE\n');
}

testUserEndpoints().catch(console.error);
