// Test Flutterwave Virtual Account API
// Check if we can create dedicated virtual accounts for customers

const FLUTTERWAVE_SECRET_KEY = 'FLWSECK-8418a0f04d0f2607700e26359061f5b9-19aefa26fd7vt-X';
const BASE_URL = 'https://api.flutterwave.com/v3';

async function makeRequest(endpoint, method = 'GET', data = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${method} ${endpoint}`);
  console.log('='.repeat(60));
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
      console.log('Request body:', JSON.stringify(data, null, 2));
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
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

async function testVirtualAccounts() {
  console.log('\n🔍 FLUTTERWAVE VIRTUAL ACCOUNT API TEST\n');
  
  // 1. Check account balance first
  console.log('\n📌 1. CHECKING ACCOUNT BALANCE\n');
  await makeRequest('/balances/NGN');
  
  // 2. List existing virtual accounts
  console.log('\n📌 2. LIST EXISTING VIRTUAL ACCOUNTS\n');
  await makeRequest('/virtual-account-numbers');
  
  // 3. Try to create a virtual account (test)
  console.log('\n📌 3. TEST CREATE VIRTUAL ACCOUNT\n');
  const testData = {
    email: 'test@tadavtu.com',
    is_permanent: true,
    bvn: '22823581760', // Your BVN from SMEPlug
    tx_ref: 'TADA-VA-TEST-' + Date.now(),
    phonenumber: '09063546728',
    firstname: 'Test',
    lastname: 'User',
    narration: 'TADA VTU Wallet Funding'
  };
  
  await makeRequest('/virtual-account-numbers', 'POST', testData);
  
  // 4. Check virtual account creation requirements
  console.log('\n📌 4. CHECK BANKS FOR VIRTUAL ACCOUNTS\n');
  await makeRequest('/banks/NG');
  
  // 5. Check if there's a bulk virtual account endpoint
  console.log('\n📌 5. CHECK BULK VIRTUAL ACCOUNT OPTIONS\n');
  await makeRequest('/bulk-virtual-account-numbers');
  
  console.log('\n\n✅ FLUTTERWAVE VIRTUAL ACCOUNT TEST COMPLETE\n');
}

testVirtualAccounts().catch(console.error);
