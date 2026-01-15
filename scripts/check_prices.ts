
// Script to simulate markup on data plans
import { getMergedDataPlans, MergedDataPlan } from './src/lib/api/merged-data-plans';

async function main() {
    process.env.INLOMAX_API_KEY = process.env.INLOMAX_API_KEY || "dummy_key_if_missing"; // ensure key exists if testing locally

    console.log("Fetching current plans...");

    // In a real run we need the API key, but for simulation we might need to mock or ensure env var is set.
    // Assuming the environment this runs in has access to .env or keys.
    const { plans } = await getMergedDataPlans();

    // If no plans (e.g. no API key), mock some common ones for demonstration
    const networks = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
    const mockPlans: MergedDataPlan[] = [
        { id: '1', provider: 'inlomax', network: 'MTN', name: '1GB SME', size: '1GB', sizeInMB: 1024, price: 255, type: 'SME', validity: '30 Days', pricePerGB: 255, description: '1GB SME' },
        { id: '2', provider: 'inlomax', network: 'MTN', name: '2GB SME', size: '2GB', sizeInMB: 2048, price: 510, type: 'SME', validity: '30 Days', pricePerGB: 255, description: '2GB SME' },
        { id: '3', provider: 'inlomax', network: 'AIRTEL', name: '1GB Corporate', size: '1GB', sizeInMB: 1024, price: 210, type: 'CORPORATE', validity: '30 Days', pricePerGB: 210, description: '1GB Corp' },
        { id: '4', provider: 'inlomax', network: 'GLO', name: '5GB Gift', size: '5GB', sizeInMB: 5120, price: 1300, type: 'GIFTING', validity: '30 Days', pricePerGB: 260, description: '5GB Gift' }
    ];

    const allPlans = (Object.keys(plans).length > 0 && plans['MTN']?.length > 0)
        ? Object.values(plans).flat()
        : mockPlans;

    console.log("\n--- PRICE COMPARISON (5% MARKUP) ---");
    console.log("Plan Name".padEnd(20) + " | " + "Cost (Current)".padEnd(15) + " | " + "New Price (+5%)".padEnd(15) + " | " + "Profit".padEnd(10));
    console.log("-".repeat(70));

    const samplePlans = allPlans.slice(0, 15); // Show first 15

    for (const plan of samplePlans) {
        const cost = plan.price;
        const sellingPrice = Math.ceil(cost * 1.05); // 5% markup
        const profit = sellingPrice - cost;

        console.log(
            plan.name.padEnd(20).slice(0, 20) + " | " +
            `₦${cost}`.padEnd(15) + " | " +
            `₦${sellingPrice}`.padEnd(15) + " | " +
            `₦${profit}`.padEnd(10)
        );
    }
}

main().catch(console.error);
