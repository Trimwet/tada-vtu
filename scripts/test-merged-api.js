// Test the merged data plans API endpoint
// Run: node scripts/test-merged-api.js

async function testMergedAPI() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // First, clear cache and reset circuits
    console.log('Clearing cache...');
    const clearRes = await fetch(`${baseUrl}/api/data-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear-cache' }),
    });
    console.log('Clear cache response:', await clearRes.json());

    // Reset SMEPlug circuit
    console.log('\nResetting SMEPlug circuit...');
    const resetRes = await fetch(`${baseUrl}/api/data-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-circuit', provider: 'smeplug' }),
    });
    console.log('Reset circuit response:', await resetRes.json());

    // Now fetch plans with refresh
    console.log('\nFetching MTN plans with refresh...');
    const plansRes = await fetch(`${baseUrl}/api/data-plans?network=MTN&refresh=true`);
    const plansData = await plansRes.json();
    
    console.log('Success:', plansData.success);
    console.log('Plan count:', plansData.count);
    console.log('Types:', plansData.types);
    console.log('Meta:', JSON.stringify(plansData.meta, null, 2));
    
    if (plansData.plans && plansData.plans.length > 0) {
      // Count by provider
      const byProvider = {};
      for (const plan of plansData.plans) {
        byProvider[plan.provider] = (byProvider[plan.provider] || 0) + 1;
      }
      console.log('\nPlans by provider:', byProvider);
      
      // Show sample from each provider
      const inlomaxSample = plansData.plans.find(p => p.provider === 'inlomax');
      const smeplugSample = plansData.plans.find(p => p.provider === 'smeplug');
      
      if (inlomaxSample) console.log('\nInlomax sample:', JSON.stringify(inlomaxSample, null, 2));
      if (smeplugSample) console.log('\nSMEPlug sample:', JSON.stringify(smeplugSample, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMergedAPI();
