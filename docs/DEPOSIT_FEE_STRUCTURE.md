# TADA VTU - Bank Transfer Deposit Fee Structure

## Overview

This document outlines the fee structure for bank transfer deposits on TADA VTU. The hybrid fee model ensures sustainable operations while keeping costs low for users.

## Fee Structure

| Deposit Amount | Fee Type | Fee Amount | Effective Rate |
|----------------|----------|------------|----------------|
| ₦100 - ₦4,999 | Flat | ₦30 | 0.6% - 30% |
| ₦5,000+ | Percentage | 2.5% | 2.5% |

## Examples

| User Wants | Fee | Total Transfer | User Gets |
|------------|-----|----------------|-----------|
| ₦500 | ₦30 | ₦530 | ₦500 |
| ₦1,000 | ₦30 | ₦1,030 | ₦1,000 |
| ₦2,000 | ₦30 | ₦2,030 | ₦2,000 |
| ₦4,999 | ₦30 | ₦5,029 | ₦4,999 |
| ₦5,000 | ₦125 | ₦5,125 | ₦5,000 |
| ₦10,000 | ₦250 | ₦10,250 | ₦10,000 |
| ₦20,000 | ₦500 | ₦20,500 | ₦20,000 |
| ₦50,000 | ₦1,250 | ₦51,250 | ₦50,000 |
| ₦100,000 | ₦2,500 | ₦102,500 | ₦100,000 |

## Rationale

### Why Hybrid Fees?

Flutterwave charges approximately **2% processing fee** on bank transfers (capped at ₦2,000). With a flat ₦30 fee:

- **Small deposits (< ₦1,500)**: Profitable - FLW fee is less than ₦30
- **Large deposits (> ₦1,500)**: Loss-making - FLW fee exceeds ₦30

The hybrid model ensures:
1. **Small deposits remain affordable** - ₦30 flat fee
2. **Large deposits cover costs** - 2.5% covers FLW's 2% + small margin
3. **Sustainable business model** - No loss on any transaction

### Comparison with Competitors

| Platform | Fee Structure |
|----------|---------------|
| OPay | 1.5% (min ₦10) |
| PalmPay | Free (subsidized) |
| Kuda | Free (subsidized) |
| **TADA VTU** | ₦30 flat / 2.5% |

## Technical Implementation

### Files Modified

- `src/lib/api/flutterwave.ts` - Fee calculation functions
- `src/app/api/flutterwave/fee-check/route.ts` - Fee check API
- `src/app/api/flutterwave/webhook/route.ts` - Deposit processing
- `src/lib/api/deposit-processor.ts` - Deposit credit calculation

### Key Functions

```typescript
// Calculate fee based on amount
calculateBankTransferFee(amount: number): number

// Get fee tier info for display
getBankTransferFeeTier(amount: number): { fee, isFlat, percentage?, tier }

// Calculate total to transfer
calculateBankTransferTotal(walletAmount: number): { walletCredit, platformFee, totalToTransfer }

// Reverse calculation from transfer amount
calculateWalletCreditFromTransfer(transferAmount: number): { walletCredit, platformFee }
```

### Constants

```typescript
BANK_TRANSFER_FEE_FLAT = 30        // ₦30 for amounts < ₦5,000
BANK_TRANSFER_FEE_PERCENTAGE = 0.025  // 2.5% for amounts ≥ ₦5,000
BANK_TRANSFER_FEE_THRESHOLD = 5000    // Threshold between flat and percentage
```

## Changelog

| Date | Change |
|------|--------|
| 2026-01-16 | Implemented hybrid fee structure (flat ₦30 / 2.5%) |
| Previous | Flat ₦30 fee for all amounts |
