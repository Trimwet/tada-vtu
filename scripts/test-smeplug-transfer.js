// Test SMEPlug Transfer Send API
// Endpoint: POST /api/v1/transfer/send
const SMEPLUG_API_URL = 'https://smeplug.ng/api/v1';
const apiKey = '563e262c80387b47d4301cfdfc182b72cfd747a8c3b3fb158fa77cba308147eb';

async function testTransferSend() {
  console.log('=== Testing SMEPlug /transfer/send ===');
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  
  const payload = {
    bank_code: '000014', // Access Bank
    account_number: '0690000040', // Test account
    amount: '100',
    description: 'Test withdrawal from TADA VTU',
    customer_reference: `TADA-TEST-${Date.now()}`,
  };
  
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(`${SMEPLUG_API_URL}/transfer/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    
    console.log('\nStatus:', response.status);
    const text = await response.text();
    console.log('Raw Response:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('\nParsed Response:', JSON.stringify(json, null, 2));
      
      if (json.status === true || json.status === 'success') {
        console.log('\n✅ Transfer initiated successfully!');
        console.log('Reference:', json.reference || json.data?.reference);
      } else {
        console.log('\n❌ Transfer failed:', json.message);
      }
    } catch {
      console.log('Could not parse response as JSON');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTransferSend();
