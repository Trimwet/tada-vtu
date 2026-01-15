
const BANK_TRANSFER_FEE = 30;

function calculateFlutterwaveFee(amount) {
    const fee = Math.ceil(amount * 0.02);
    return Math.min(fee, 2000);
}

// MATCHING NEW LOGIC IN FLUTTERWAVE.TS
function calculateBankTransferTotal(walletAmount) {
    const platformFee = BANK_TRANSFER_FEE;
    // We still calculate processing fee for internal tracking, but don't charge user
    const processingFee = calculateFlutterwaveFee(walletAmount + platformFee);
    const totalToTransfer = walletAmount + platformFee;

    return {
        walletCredit: walletAmount,
        platformFee,
        processingFee,
        totalToTransfer,
    };
}

console.log("--- Fee Calculation Test (New Logic) ---");

const amount = 2000;
const bankTransfer = calculateBankTransferTotal(amount);
console.log(`Amount: ${amount}`);
console.log(`Bank Transfer Total: `, bankTransfer);
console.log(`Total Fee Paid by User: ${bankTransfer.totalToTransfer - amount}`);

if (bankTransfer.totalToTransfer - amount === 30) {
    console.log("SUCCESS: Fee is exactly 30");
} else {
    console.log("FAILURE: Fee includes extra charges");
}
