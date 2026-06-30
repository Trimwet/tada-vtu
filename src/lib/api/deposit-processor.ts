import { coreDeposit, CoreDepositResult } from './core';
import { calculateWalletCreditFromTransfer } from './flutterwave';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(url, key);
}

const HOLD_DAYS = 3;

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
 * Inserts a 3-day deposit hold BEFORE crediting to prevent the race window
 * where a deposit is credited but no hold exists yet.
 * Uses externalReference as the stable transaction_reference across retries.
 */
export async function processDeposit(data: DepositData): Promise<CoreDepositResult> {
  const { userId, amount, walletCredit, fee, reference, externalReference, paymentType, description, metadata } = data;

  console.log(`🚀 [DEPOSIT] user=${userId} ref=${reference} credit=₦${walletCredit} fee=₦${fee}`);

  // ── Insert deposit hold BEFORE crediting (closes race window) ────────────
  try {
    const supabase = getSupabaseAdmin();
    const releaseAt = new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { error: holdError } = await supabase.from('deposit_holds').insert({
      user_id: userId,
      wallet_credit: Math.max(walletCredit, 0),
      gross_amount: amount,
      transaction_reference: externalReference,
      release_at: releaseAt,
    });

    if (holdError) {
      if (holdError.code === '23505') {
        console.log(`[DEPOSIT] hold already exists for ${externalReference} (webhook retry)`);
      } else {
        console.error(`[DEPOSIT] ⚠ hold insert failed for ${reference}: ${holdError.message}`);
      }
    } else {
      console.log(`[DEPOSIT] 🔒 hold created, releases at ${releaseAt}`);
    }
  } catch (holdErr) {
    console.error(`[DEPOSIT] ⚠ hold insert exception for ${reference}:`, holdErr);
  }

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
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('deposit_holds').delete().eq('transaction_reference', externalReference);
      console.log(`[DEPOSIT] 🧹 cleaned up hold for failed deposit ${reference}`);
    } catch (cleanupErr) {
      console.error(`[DEPOSIT] ⚠ hold cleanup failed for ${reference}:`, cleanupErr);
    }

    console.error(`❌ [DEPOSIT] failed ref=${reference}:`, error);
    throw error;
  }
}
