// Test SMEPlug Transfer Banks API
const SMEPLUG_API_URL = 'https://smeplug.ng/api/v1';
const apiKey = '563e262c80387b47d4301cfdfc182b72cfd747a8c3b3fb158fa77cba308147eb';

async function testBanks() {
  console.log('Testing SMEPlug Transfer Banks API...');

  try {
    const response = await fetch(`${SMEPLUG_API_URL}/transfer/banks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const text = await response.text();
    console.log('Status:', response.status);
    
    const data = JSON.parse(text);
    console.log('Response status:', data.status);
    console.log('Banks count:', data.banks?.length || data.data?.length || 0);
    
    const banks = data.banks || data.data || [];
    if (banks.length > 0) {
      console.log('\nFirst 10 banks:');
      banks.slice(0, 10).forEach(b => console.log(`  - ${b.name} (${b.code})`));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBanks();
