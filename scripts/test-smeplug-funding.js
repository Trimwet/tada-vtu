// Test SMEPlug API for wallet funding options
// Looking for virtual account generation and funding endpoints

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
      console.log('Raw Response:', text.substring(0, 500));
      return null;
    }
  } catch (error) {
    console.log('Error:', error.message);
    return null;
  }
}

async function testAllEndpoints() {
  console.log('\n🔍 SMEPLUG API EXPLORATION - WALLET FUNDING OPTIONS\n');
  console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT SET');
  
  // 1. Check current balance
  await makeRequest('/account/balance');
  
  // 2. Try to find virtual account endpoints
  console.log('\n\n📌 TESTING POTENTIAL VIRTUAL ACCOUNT ENDPOINTS\n');
  
  // Common virtual account endpoint patterns
  const potentialEndpoints = [
    '/virtual-account',
    '/virtual-accounts',
    '/account/virtual',
    '/account/virtual-account',
    '/funding/virtual-account',
    '/wallet/virtual-account',
    '/generate-account',
    '/create-account',
    '/reserved-account',
    '/dedicated-account',
    '/bank-account',
    '/account/bank',
    '/funding',
    '/fund-wallet',
    '/wallet/fund',
    '/payment/initialize',
    '/payment/options',
    '/account/funding-options',
    '/account/details',
    '/user/account',
    '/profile',
    '/account/info',
  ];
  
  for (const endpoint of potentialEndpoints) {
    await makeRequest(endpoint);
  }
  
  // 3. Try POST requests for account generation
  console.log('\n\n📌 TESTING POST ENDPOINTS FOR ACCOUNT GENERATION\n');
  
  const postEndpoints = [
    { endpoint: '/virtual-account/create', data: {} },
    { endpoint: '/virtual-account/generate', data: {} },
    { endpoint: '/account/create-virtual', data: {} },
    { endpoint: '/funding/create-account', data: {} },
  ];
  
  for (const { endpoint, data } of postEndpoints) {
    await makeRequest(endpoint, 'POST', data);
  }
  
  // 4. Check transaction types to understand funding methods
  console.log('\n\n📌 CHECKING TRANSACTION HISTORY FOR FUNDING PATTERNS\n');
  await makeRequest('/transactions?type=funding&page=1');
  await makeRequest('/transactions?page=1');
  
  // 5. Check if there's a charges/fees endpoint
  console.log('\n\n📌 CHECKING FOR CHARGES/FEES INFORMATION\n');
  await makeRequest('/charges');
  await makeRequest('/fees');
  await makeRequest('/pricing');
  await makeRequest('/account/charges');
  await makeRequest('/usage-charges');
  
  console.log('\n\n✅ API EXPLORATION COMPLETE\n');
}

testAllEndpoints().catch(console.error);
