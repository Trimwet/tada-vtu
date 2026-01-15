
// Script to simulate markup on data plans (JS Version)

async function main() {
    console.log("Fetching simulated plans...");

    // Mock plans since we can't easily import the typescript module in vanilla node without build
    const mockPlans = [
        { name: '1GB SME', price: 255 },
        { name: '2GB SME', price: 510 },
        { name: '5GB SME', price: 1275 },
        { name: '10GB SME', price: 2550 },
        { name: '1GB Corp', price: 210 },
        { name: '5GB Gift', price: 1300 },
        { name: '10GB Gift', price: 2600 },
        { name: '1GB Airte', price: 280 },
        { name: '2GB Glo', price: 520 },
        { name: '1.5GB 9m', price: 350 }
    ];

    console.log("\n--- PRICE COMPARISON (5% MARKUP) ---");
    console.log("Plan Name".padEnd(15) + " | " + "Cost (Current)".padEnd(15) + " | " + "New Price (+5%)".padEnd(15) + " | " + "Profit".padEnd(10));
    console.log("-".repeat(60));

    for (const plan of mockPlans) {
        const cost = plan.price;
        const sellingPrice = Math.ceil(cost * 1.05); // 5% markup
        const profit = sellingPrice - cost;

        console.log(
            plan.name.padEnd(15) + " | " +
            `₦${cost}`.padEnd(15) + " | " +
            `₦${sellingPrice}`.padEnd(15) + " | " +
            `₦${profit}`.padEnd(10)
        );
    }
}

main().catch(console.error);
