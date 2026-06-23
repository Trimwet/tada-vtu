/**
 * Deposit processor — handles wallet funding via Flutterwave.
 *
 * All financial writes go through the Go Core service (src/lib/api/core.ts).
 * This module no longer holds a Supabase client — Core owns the money.
 */

import { coreDeposit, CoreDepositResult } from './core';
import { calculateWalletCreditFromTransfer } from './flutterwave';

export interface DepositData {
  userId: string;
  /** Gross amount from Flutterwave */
  amount: number;
  /** Net amount credited to the user after fees */
  walletCredit: number;
  /** Platform fee deducted */
  fee: number;
  reference: string;
  externalReference: string;
  paymentType: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/** Calculate deposit amounts from a bank transfer (used by webhook). */
export function calculateDepositFromTransfer(transferAmount: number): {
  walletCredit: number;
  fee: number;
} {
  const result = calculateWalletCreditFromTransfer(transferAmount);
  return { walletCredit: result.walletCredit, fee: result.platformFee };
}

/**
 * Process a wallet deposit via Core.
 *
 * Core handles:
 *   - Duplicate detection (idempotency by reference)
 *   - Atomic balance credit via Supabase RPC
 *   - Transaction record creation
 *   - User notification
 *
 * Safe to call multiple times with the same reference (webhook + verify race).
 */
export async function processDeposit(data: DepositData): Promise<CoreDepositResult> {
  const { userId, amount, walletCredit, fee, reference, externalReference, paymentType, description, metadata } = data;

  console.log(`🚀 [DEPOSIT] user=${userId} ref=${reference} credit=₦${walletCredit} fee=₦${fee}`);

  try {
    const result = await coreDeposit({
      userId,
      amount,
      walletCredit: Math.max(walletCredit, 0),
      fee,
      reference,
      externalReference,
      paymentType,
      description,
      metadata,
    });

    if (result.alreadyProcessed) {
      console.log(`[DEPOSIT] idempotent — already processed: ${reference}`);
    } else {
      console.log(`✅ [DEPOSIT] done user=${userId} new_balance=₦${result.newBalance}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ [DEPOSIT] failed ref=${reference}:`, error);
    throw error;
  }
}
