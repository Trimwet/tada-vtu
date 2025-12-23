// Compare Data Plans from Inlomax and SMEPlug
// Run: node scripts/compare-data-plans.js

const fs = require('fs');
const path = require('path');

// API Keys (for testing only - in production use env vars)
const INLOMAX_API_KEY = 'vp5sh8evbcxcf81r3wrrbm0p26y5xl9r8yw4eatl';
const SMEPLUG_API_KEY = '563e262c80387b47d4301cfdfc182b72cfd747a8c3b3fb158fa77cba308147eb';

const NETWORKS = {
  MTN: { inlomax: 1, smeplug: 1 },
  AIRTEL: { inlomax: 2, smeplug: 2 },
  GLO: { inlomax: 3, smeplug: 4 },
  '9MOBILE': { inlomax: 4, smeplug: 3 },
};

async function fetchInlomaxPlans() {
  console.log('\n📡 Fetching Inlomax data plans...');
  try {
    const response = await fetch('https://inlomax.com/api/services', {
      headers: { 'Authorization': `Token ${INLOMAX_API_KEY}` }
    });
    const data = await response.json();
    
    if (data.status !== 'success') {
      console.error('Inlomax error:', data.message);
      return null;
    }
    
    // Return the dataPlans array directly
    return data.data?.dataPlans || [];
  } catch (error) {
    console.error('Inlomax fetch error:', error.message);
    return null;
  }
}

async function fetchSMEPlugPlans() {
  console.log('📡 Fetching SMEPlug data plans...');
  try {
    const response = await fetch('https://smeplug.ng/api/v1/data/plans', {
      headers: { 
        'Authorization': `Bearer ${SMEPLUG_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    if (!data.status) {
      console.error('SMEPlug error:', data.message);
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('SMEPlug fetch error:', error.message);
    return null;
  }
}

function parseInlomaxPlans(dataPlans) {
  const plans = { MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [] };
  
  if (!dataPlans || !Array.isArray(dataPlans)) return plans;
  
  dataPlans.forEach(plan => {
    if (!plan || !plan.network) return;
    
    const network = plan.network.toUpperCase();
    if (!plans[network] && network !== 'ETISALAT') return;
    
    const targetNetwork = network === 'ETISALAT' ? '9MOBILE' : network;
    
    plans[targetNetwork].push({
      provider: 'INLOMAX',
      id: plan.serviceID,
      name: `${plan.dataPlan} [${plan.dataType}]`,
      price: parseFloat(plan.amount.replace(/,/g, '')),
      type: plan.dataType || 'SME',
      size: extractSize(plan.dataPlan),
      validity: plan.validity,
    });
  });
  
  return plans;
}

function parseSMEPlugPlans(data) {
  const plans = { MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [] };
  const networkMap = { '1': 'MTN', '2': 'AIRTEL', '3': '9MOBILE', '4': 'GLO' };
  
  if (!data) return plans;
  
  Object.entries(data).forEach(([networkId, networkPlans]) => {
    const network = networkMap[networkId];
    if (!network || !Array.isArray(networkPlans)) return;
    
    networkPlans.forEach(plan => {
      plans[network].push({
        provider: 'SMEPLUG',
        id: plan.id,
        name: plan.name,
        price: parseFloat(plan.price),
        type: extractType(plan.name),
        size: extractSize(plan.name),
      });
    });
  });
  
  return plans;
}

function extractSize(name) {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return value * 1024;
    if (unit === 'TB') return value * 1024 * 1024;
    return value; // MB
  }
  return 0;
}

function extractType(name) {
  const upper = name.toUpperCase();
  if (upper.includes('SME')) return 'SME';
  if (upper.includes('CORPORATE') || upper.includes('CG')) return 'CORPORATE';
  if (upper.includes('GIFTING')) return 'GIFTING';
  if (upper.includes('DIRECT')) return 'DIRECT';
  if (upper.includes('AWOOF')) return 'AWOOF';
  return 'OTHER';
}

function comparePlans(inlomaxPlans, smeplugPlans) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DATA PLANS COMPARISON - INLOMAX vs SMEPLUG');
  console.log('='.repeat(80));
  
  const allPlans = { MTN: [], AIRTEL: [], GLO: [], '9MOBILE': [] };
  
  // Combine all plans
  Object.keys(NETWORKS).forEach(network => {
    allPlans[network] = [
      ...inlomaxPlans[network],
      ...smeplugPlans[network]
    ].sort((a, b) => a.size - b.size || a.price - b.price);
  });
  
  // Print comparison for each network
  Object.entries(allPlans).forEach(([network, plans]) => {
    console.log(`\n🔷 ${network} DATA PLANS`);
    console.log('-'.repeat(80));
    console.log(
      'Provider'.padEnd(10) +
      'Plan Name'.padEnd(35) +
      'Price'.padEnd(12) +
      'Type'.padEnd(12) +
      '₦/GB'
    );
    console.log('-'.repeat(80));
    
    plans.forEach(plan => {
      const pricePerGB = plan.size > 0 ? (plan.price / (plan.size / 1024)).toFixed(0) : 'N/A';
      console.log(
        plan.provider.padEnd(10) +
        plan.name.substring(0, 33).padEnd(35) +
        `₦${plan.price}`.padEnd(12) +
        plan.type.padEnd(12) +
        (pricePerGB !== 'N/A' ? `₦${pricePerGB}` : pricePerGB)
      );
    });
    
    // Find cheapest per size
    const sizeGroups = {};
    plans.forEach(plan => {
      if (plan.size > 0) {
        const sizeKey = plan.size;
        if (!sizeGroups[sizeKey] || sizeGroups[sizeKey].price > plan.price) {
          sizeGroups[sizeKey] = plan;
        }
      }
    });
    
    console.log(`\n💰 CHEAPEST ${network} PLANS BY SIZE:`);
    Object.values(sizeGroups)
      .sort((a, b) => a.size - b.size)
      .slice(0, 5)
      .forEach(plan => {
        const sizeStr = plan.size >= 1024 ? `${(plan.size/1024).toFixed(1)}GB` : `${plan.size}MB`;
        console.log(`   ${sizeStr}: ${plan.provider} - ₦${plan.price} (${plan.name})`);
      });
  });
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  
  let inlomaxTotal = 0, smeplugTotal = 0;
  let inlomaxCheaper = 0, smeplugCheaper = 0;
  
  Object.keys(NETWORKS).forEach(network => {
    inlomaxTotal += inlomaxPlans[network].length;
    smeplugTotal += smeplugPlans[network].length;
  });
  
  console.log(`\nInlomax Plans: ${inlomaxTotal}`);
  console.log(`SMEPlug Plans: ${smeplugTotal}`);
  console.log(`\nRecommendation: Use BOTH providers to give users maximum variety!`);
  
  return allPlans;
}

async function main() {
  console.log('🚀 Starting Data Plans Comparison...');
  console.log(`Inlomax API Key: ${INLOMAX_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`SMEPlug API Key: ${SMEPLUG_API_KEY ? '✅ Set' : '❌ Missing'}`);
  
  if (!INLOMAX_API_KEY || !SMEPLUG_API_KEY) {
    console.error('\n❌ Missing API keys! Check your .env.local file.');
    process.exit(1);
  }
  
  const [inlomaxData, smeplugData] = await Promise.all([
    fetchInlomaxPlans(),
    fetchSMEPlugPlans()
  ]);
  
  const inlomaxPlans = parseInlomaxPlans(inlomaxData);
  const smeplugPlans = parseSMEPlugPlans(smeplugData);
  
  const allPlans = comparePlans(inlomaxPlans, smeplugPlans);
  
  // Save to JSON for reference
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/data-plans-comparison.json',
    JSON.stringify({ inlomax: inlomaxPlans, smeplug: smeplugPlans, combined: allPlans }, null, 2)
  );
  console.log('\n✅ Saved comparison to scripts/data-plans-comparison.json');
}

main().catch(console.error);
