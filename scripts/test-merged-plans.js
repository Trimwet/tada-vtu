// Test Merged Data Plans
// Run: node scripts/test-merged-plans.js

const INLOMAX_API_KEY = 'vp5sh8evbcxcf81r3wrrbm0p26y5xl9r8yw4eatl';
const SMEPLUG_API_KEY = '563e262c80387b47d4301cfdfc182b72cfd747a8c3b3fb158fa77cba308147eb';

async function fetchInlomaxPlans() {
  const response = await fetch('https://inlomax.com/api/services', {
    headers: { 'Authorization': `Token ${INLOMAX_API_KEY}` }
  });
  const data = await response.json();
  return data.data?.dataPlans || [];
}

async function fetchSmeplugPlans() {
  const response = await fetch('https://smeplug.ng/api/v1/data/plans', {
    headers: { 
      'Authorization': `Bearer ${SMEPLUG_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  return data.data || {};
}

function extractSizeInMB(name) {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return value * 1024;
    if (unit === 'TB') return value * 1024 * 1024;
    return value;
  }
  return 0;
}

async function main() {
  console.log('🚀 Testing Merged Data Plans...\n');

  const [inlomaxRaw, smeplugRaw] = await Promise.all([
    fetchInlomaxPlans(),
    fetchSmeplugPlans()
  ]);

  // Parse Inlomax
  const inlomaxPlans = { MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [] };
  for (const plan of inlomaxRaw) {
    const network = plan.network.toUpperCase() === 'ETISALAT' ? '9MOBILE' : plan.network.toUpperCase();
    if (!inlomaxPlans[network]) continue;
    
    const price = parseFloat(plan.amount.replace(/,/g, ''));
    if (isNaN(price) || price <= 0) continue;
    
    inlomaxPlans[network].push({
      provider: 'INLOMAX',
      id: plan.serviceID,
      name: plan.dataPlan,
      type: plan.dataType,
      price,
      sizeInMB: extractSizeInMB(plan.dataPlan),
    });
  }

  // Parse SMEPlug
  const smeplugPlans = { MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [] };
  const networkMap = { '1': 'MTN', '2': 'AIRTEL', '3': '9MOBILE', '4': 'GLO' };
  
  for (const [networkId, plans] of Object.entries(smeplugRaw)) {
    const network = networkMap[networkId];
    if (!network || !Array.isArray(plans)) continue;
    
    for (const plan of plans) {
      const price = parseFloat(plan.price);
      if (isNaN(price) || price <= 0) continue;
      
      smeplugPlans[network].push({
        provider: 'SMEPLUG',
        id: plan.id,
        name: plan.name,
        type: 'GIFTING',
        price,
        sizeInMB: extractSizeInMB(plan.name),
      });
    }
  }

  // Merge and compare
  console.log('📊 MERGED PLANS COMPARISON\n');
  console.log('='.repeat(80));

  for (const network of ['MTN', 'AIRTEL', 'GLO', '9MOBILE']) {
    console.log(`\n🔷 ${network}`);
    console.log('-'.repeat(80));
    
    const allPlans = [...inlomaxPlans[network], ...smeplugPlans[network]];
    
    // Group by size (rounded to nearest 100MB)
    const groups = {};
    for (const plan of allPlans) {
      const sizeKey = Math.round(plan.sizeInMB / 100) * 100;
      if (!groups[sizeKey]) groups[sizeKey] = [];
      groups[sizeKey].push(plan);
    }

    // Show comparison for each size
    const sortedSizes = Object.keys(groups).map(Number).sort((a, b) => a - b);
    
    let cheaperInlomax = 0, cheaperSmeplug = 0, onlyOne = 0;
    
    for (const size of sortedSizes.slice(0, 15)) { // Show first 15 sizes
      const plans = groups[size];
      const sizeStr = size >= 1024 ? `${(size/1024).toFixed(1)}GB` : `${size}MB`;
      
      const inlomaxPlan = plans.find(p => p.provider === 'INLOMAX');
      const smeplugPlan = plans.find(p => p.provider === 'SMEPLUG');
      
      if (inlomaxPlan && smeplugPlan) {
        const winner = inlomaxPlan.price <= smeplugPlan.price ? 'INLOMAX' : 'SMEPLUG';
        const savings = Math.abs(inlomaxPlan.price - smeplugPlan.price);
        
        if (winner === 'INLOMAX') cheaperInlomax++;
        else cheaperSmeplug++;
        
        console.log(
          `${sizeStr.padEnd(8)} | ` +
          `INLOMAX: ₦${inlomaxPlan.price.toString().padEnd(6)} | ` +
          `SMEPLUG: ₦${smeplugPlan.price.toString().padEnd(6)} | ` +
          `Winner: ${winner} (save ₦${savings})`
        );
      } else if (inlomaxPlan) {
        onlyOne++;
        console.log(`${sizeStr.padEnd(8)} | INLOMAX: ₦${inlomaxPlan.price} (only provider)`);
      } else if (smeplugPlan) {
        onlyOne++;
        console.log(`${sizeStr.padEnd(8)} | SMEPLUG: ₦${smeplugPlan.price} (only provider)`);
      }
    }
    
    console.log(`\n  Summary: Inlomax cheaper: ${cheaperInlomax}, SMEPlug cheaper: ${cheaperSmeplug}, Only one provider: ${onlyOne}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Merged plans system ready!');
  console.log('   - Users will see the cheapest option for each plan size');
  console.log('   - Plans unique to one provider are also shown');
  console.log('   - Bank transfers use SMEPlug (only provider)');
}

main().catch(console.error);
