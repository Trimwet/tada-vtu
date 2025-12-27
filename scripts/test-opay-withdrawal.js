// Test withdrawal to Opay account
// Account: 9063546728
// Amount: ₦500

const testWithdrawal = {
  // Opay bank code in Nigeria is usually "999992" 
  bankCode: "999992", // Opay Microfinance Bank
  accountNumber: "9063546728",
  amount: 500
};

console.log('Test withdrawal details:');
console.log('Bank Code:', testWithdrawal.bankCode);
console.log('Account Number:', testWithdrawal.accountNumber);
console.log('Amount:', `₦${testWithdrawal.amount}`);

// You can use this data to test via the API endpoint:
// POST /api/flutterwave/test-withdrawal
// Body: testWithdrawal

module.exports = testWithdrawal;