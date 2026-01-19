# TADA VTU - Bank Transfer Deposit Fee Structure (VAT Adjusted)

## Overview

This document outlines the fee structure for bank transfer deposits on TADA VTU. The hybrid fee model includes VAT adjustments to ensure sustainable operations while keeping costs predictable for users.

## Fee Structure

| Deposit Amount | Fee Type | Fee Amount | Effective Rate | Net Revenue (After VAT) |
|----------------|----------|------------|----------------|-------------------------|
| ₦100 - ₦4,999 | Flat | ₦30.50 | 0.6% - 30.5% | ₦30.00 |
| ₦5,000+ | Percentage | 2.5% + VAT | 2.5% + 0.15% | ~2.5% |

## Examples

| User Wants | Fee Charged | User Transfers | User Gets | Your Net Revenue |
|------------|-------------|----------------|-----------|------------------|
| ₦500 | ₦30.50 | ₦530.50 | ₦500 | ₦30.00 |
| ₦1,000 | ₦30.50 | ₦1,030.50 | ₦1,000 | ₦30.00 |
| ₦2,000 | ₦30.50 | ₦2,030.50 | ₦2,000 | ₦30.00 |
| ₦4,999 | ₦30.50 | ₦5,029.50 | ₦4,999 | ₦30.00 |
| ₦5,000 | ₦126.88 | ₦5,126.88 | ₦5,000 | ₦125.00 |
| ₦10,000 | ₦251.88 | ₦10,251.88 | ₦10,000 | ₦250.00 |
| ₦20,000 | ₦501.50 | ₦20,501.50 | ₦20,000 | ₦500.00 |

## Rationale

### VAT Adjustment

Flutterwave deducts **₦0.50 VAT** from every transaction fee. To ensure you receive exactly ₦30 for small deposits:

- **Old fee**: ₦30.00 → You get ₦29.50 (after VAT)
- **New fee**: ₦30.50 → You get ₦30.00 (after VAT)

### Why This Works

1. **Predictable revenue**: Always get exactly ₦30 for small deposits
2. **User experience**: Fee appears as ₦30.50 (minimal increase)
3. **Covers costs**: Flutterwave charges ~2% + VAT, you get 2.5%

## Technical Implementation

### Updated Constants

```typescript
BANK_TRANSFER_FEE_FLAT = 30.50        // ₦30.50 (nets ₦30 after VAT)
BANK_TRANSFER_FEE_PERCENTAGE = 0.025  // 2.5%
FLUTTERWAVE_VAT_RATE = 0.0015        // 0.15% VAT
BANK_TRANSFER_FEE_THRESHOLD = 5000    // Threshold between flat and percentage
```

### Key Changes

1. **Flat fee**: Increased from ₦30 to ₦30.50
2. **Percentage fees**: Include VAT adjustment
3. **User crediting**: Still based on ₦30 for user experience
4. **Revenue**: Guaranteed ₦30 net after VAT

## Changelog

| Date | Change |
|------|--------|
| 2026-01-19 | Added VAT adjustment (₦30.50 fee to net ₦30) |
| 2026-01-16 | Implemented hybrid fee structure (flat ₦30 / 2.5%) |
| Previous | Flat ₦30 fee for all amounts |
