// Test Virtual Account Creation with Flutterwave

const FLUTTERWAVE_SECRET_KEY = 'FLWSECK-8418a0f04d0f2607700e26359061f5b9-19aefa26fd7vt-X';
const BASE_URL = 'https://api.flutterwave.com/v3';

async function testVACreation() {
  console.log('\n🔍 Testing Virtual Account Creation WITH BVN\n');
  
  const testData = {
    email: 'jonahmafuyai@gmail.com',
    is_permanent: true,
    bvn: '22823581760', // Your BVN from SMEPlug profile
    tx_ref: 'TADA-VA-TEST-' + Date.now(),
    firstname: 'Jonah',
    lastname: 'Mafuyai',
    narration: 'TADA VTU - Jonah Mafuyai',
  };
  
  console.log('Request payload:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/virtual-account-numbers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
      body: JSON.stringify(testData),
    });
    
    const text = await response.text();
    console.log('\nStatus:', response.status);
    
    try {
      const json = JSON.parse(text);
      console.log('Response:', JSON.stringify(json, null, 2));
      
      if (json.status === 'success') {
        console.log('\n✅ Virtual account created successfully!');
        console.log('Account Number:', json.data?.account_number);
        console.log('Bank:', json.data?.bank_name);
      } else {
        console.log('\n❌ Failed:', json.message);
      }
    } catch {
      console.log('Raw response:', text);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVACreation();
