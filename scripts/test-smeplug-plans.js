// Test SMEPlug data plans API
// Run from tada-vtu directory

const SMEPLUG_API_URL = 'https://smeplug.ng/api/v1';
const apiKey = '563e262c80387b47d4301cfdfc182b72cfd747a8c3b3fb158fa77cba308147eb';

console.log('Testing SMEPlug API...');
console.log('Key prefix:', apiKey?.substring(0, 10) + '...');

async function testSmeplugPlans() {
  try {
    console.log('\nFetching SMEPlug data plans...');
    
    const response = await fetch(`${SMEPLUG_API_URL}/data/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    console.log('Response status:', response.status);
    
    const text = await response.text();
    console.log('Response body:', text.substring(0, 500));
    
    const data = JSON.parse(text);
    console.log('\nParsed response:');
    console.log('Status:', data.status);
    console.log('Message:', data.message);
    
    if (data.data) {
      console.log('\nNetworks found:', Object.keys(data.data));
      for (const [networkId, plans] of Object.entries(data.data)) {
        console.log(`Network ${networkId}: ${plans.length} plans`);
        if (plans.length > 0) {
          console.log('  Sample plan:', JSON.stringify(plans[0]));
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSmeplugPlans();
