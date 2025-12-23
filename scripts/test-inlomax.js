// Test Inlomax API
const INLOMAX_API_KEY = 'vp5sh8evbcxcf81r3wrrbm0p26y5xl9r8yw4eatl';

async function test() {
  console.log('Testing Inlomax API...\n');
  
  const response = await fetch('https://inlomax.com/api/services', {
    headers: { 'Authorization': `Token ${INLOMAX_API_KEY}` }
  });
  
  const data = await response.json();
  console.log('Status:', data.status);
  console.log('Data type:', typeof data.data);
  console.log('Data keys:', data.data ? Object.keys(data.data) : 'N/A');
  
  // Show sample of each category
  if (data.data) {
    Object.entries(data.data).forEach(([key, value]) => {
      console.log(`\n=== ${key} ===`);
      if (Array.isArray(value)) {
        console.log(`Count: ${value.length}`);
        console.log('Sample:', JSON.stringify(value.slice(0, 2), null, 2));
      } else {
        console.log('Value:', JSON.stringify(value, null, 2).substring(0, 500));
      }
    });
  }
}

test().catch(console.error);
