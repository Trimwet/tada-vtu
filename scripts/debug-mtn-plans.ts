// Debug script to check MTN data plans count
import { config } from 'dotenv';
import { getServices } from '../src/lib/api/inlomax';

// Load environment variables
config({ path: '.env.local' });

async function debugMTNPlans() {
  console.log('Fetching data plans from Inlomax...\n');
  
  try {
    const result = await getServices();
    
    if (result.status !== 'success' || !result.data?.dataPlans) {
      console.error('Failed to fetch plans:', result.message);
      return;
    }
    
    const allPlans = result.data.dataPlans;
    console.log(`Total plans from Inlomax: ${allPlans.length}`);
    
    // Filter MTN plans
    const mtnPlans = allPlans.filter(p => p.network.toUpperCase() === 'MTN');
    console.log(`\nMTN plans from Inlomax: ${mtnPlans.length}`);
    
    // Group by dataType
    const byType: Record<string, any[]> = {};
    mtnPlans.forEach(plan => {
      const type = plan.dataType || 'UNKNOWN';
      if (!byType[type]) byType[type] = [];
      byType[type].push(plan);
    });
    
    console.log('\nMTN Plans by Type:');
    Object.entries(byType).forEach(([type, plans]) => {
      console.log(`  ${type}: ${plans.length} plans`);
    });
    
    // Check for duplicates by serviceID
    const seenIds = new Set<string>();
    const duplicates: any[] = [];
    const unique: any[] = [];
    
    mtnPlans.forEach(plan => {
      const uniqueId = `${plan.serviceID}-${plan.dataType || 'default'}`;
      if (seenIds.has(uniqueId)) {
        duplicates.push(plan);
      } else {
        seenIds.add(uniqueId);
        unique.push(plan);
      }
    });
    
    console.log(`\nUnique MTN plans (after deduplication): ${unique.length}`);
    console.log(`Duplicate plans removed: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\nDuplicate plans:');
      duplicates.forEach(plan => {
        console.log(`  - ${plan.dataPlan} (${plan.dataType}) - ID: ${plan.serviceID}`);
      });
    }
    
    // Show all unique MTN plans
    console.log('\n=== ALL UNIQUE MTN PLANS ===');
    unique.forEach((plan, idx) => {
      console.log(`${idx + 1}. ${plan.dataPlan}`);
      console.log(`   Type: ${plan.dataType || 'N/A'}`);
      console.log(`   Price: ₦${plan.amount}`);
      console.log(`   ID: ${plan.serviceID}`);
      console.log(`   Validity: ${plan.validity || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugMTNPlans();
