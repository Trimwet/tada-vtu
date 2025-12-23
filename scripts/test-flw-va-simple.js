// Simple test for Flutterwave Virtual Account creation

const FLUTTERWAVE_SECRET_KEY = 'FLWSECK-8418a0f04d0f2607700e26359061f5b9-19aefa26fd7vt-X';
const BASE_URL = 'https://api.flutterwave.com/v3';

async function safeJson(response) {
  const text = await response.text();
  console.log('Status:', response.status);
  try {
    return JSON.parse(text);
  } catch {
    console.log('Raw:', text.substring(0, 500));
    return { error: text };
  }
}

async function testVirtualAccount() {
  console.log('\n🔍 FLUTTERWAVE VIRTUAL ACCOUNT TEST\n');
  
  // 1. List existing virtual accounts
  console.log('📌 1. LISTING EXISTING VIRTUAL ACCOUNTS...\n');
  
  const listResponse = await fetch(`${BASE_URL}/virtual-account-numbers`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
    },
  });
  
  const listData = await safeJson(listResponse);
  console.log('Existing accounts:', JSON.stringify(listData, null, 2));
  
  // 2. Try to create a virtual account
  console.log('\n📌 2. CREATING TEST VIRTUAL ACCOUNT...\n');
  
  const createResponse = await fetch(`${BASE_URL}/virtual-account-numbers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
    },
    body: JSON.stringify({
      email: 'testuser@tadavtu.com',
      is_permanent: true,
      bvn: '22823581760',
      tx_ref: 'TADA-VA-' + Date.now(),
      phonenumber: '09063546728',
      firstname: 'Test',
      lastname: 'User',
      narration: 'TADA VTU Wallet'
    }),
  });
  
  const createData = await safeJson(createResponse);
  console.log('Create response:', JSON.stringify(createData, null, 2));
  
  // 3. Check charges/fees
  console.log('\n📌 3. CHECKING TRANSFER FEES...\n');
  
  const feeResponse = await fetch(`${BASE_URL}/transfers/fee?amount=1000&currency=NGN`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
    },
  });
  
  const feeData = await safeJson(feeResponse);
  console.log('Transfer fees:', JSON.stringify(feeData, null, 2));
}

testVirtualAccount().catch(console.error);
