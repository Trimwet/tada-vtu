import { SupabaseClient } from '@supabase/supabase-js';
import { calculateWalletCreditFromTransfer } from './flutterwave';

export interface DepositData {
    userId: string;
    amount: number;        // gross amount from provider
    walletCredit: number;  // net amount to credit user
    fee: number;
    reference: string;
    externalReference: string;
    paymentType: string;
    description: string;
    metadata?: any;
}

export function calculateDepositFromTransfer(transferAmount: number): {
    walletCredit: number;
    fee: number;
} {
    const result = calculateWalletCreditFromTransfer(transferAmount);
    return {
        walletCredit: result.walletCredit,
        fee: result.platformFee,
    };
}

// ─── Core service client ──────────────────────────────────────────────────────

const CORE_URL = process.env.TADA_CORE_URL || 'http://localhost:8080';
const CORE_SECRET = process.env.CORE_SECRET || '';

async function callCore(path: string, body: unknown): Promise<Response> {
    return fetch(`${CORE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CORE_SECRET}`,
        },
        body: JSON.stringify(body),
    });
}

// ─── Main deposit function ────────────────────────────────────────────────────

/**
 * processDeposit — credits a user's wallet after a successful payment.
 *
 * Strategy: try Core first, fall back to direct Supabase if Core is unavailable.
 * This allows the strangler fig migration to be safe — the old code stays as
 * the fallback until Core is fully stable in production.
 */
export async function processDeposit(supabase: SupabaseClient, data: DepositData) {
    const { userId, amount, walletCredit, fee, reference, externalReference, paymentType, description, metadata } = data;

    console.log(`🚀 [DEPOSIT] Starting: user=${userId} ref=${reference} credit=₦${walletCredit}`);

    // ── Try Core first ────────────────────────────────────────────────────────
    if (CORE_SECRET) {
        try {
            const res = await callCore('/ledger/deposit', {
                userId,
                amount,
                walletCredit,
                fee,
                reference,
                externalReference,
                paymentType,
                description,
                metadata,
            });

            if (res.ok) {
                const result = await res.json();
                console.log(`✅ [DEPOSIT] Core handled: user=${userId} new_balance=${result.newBalance}`);
                return { success: true, newBalance: result.newBalance };
            }

            // Core returned an error — log it and fall through to Supabase fallback
            const errText = await res.text();
            console.warn(`[DEPOSIT] Core returned ${res.status}: ${errText} — falling back to Supabase`);

        } catch (coreErr) {
            // Core is unreachable (not running, network error, etc.)
            console.warn(`[DEPOSIT] Core unreachable: ${coreErr} — falling back to Supabase`);
        }
    } else {
        console.log('[DEPOSIT] CORE_SECRET not set — using Supabase directly');
    }

    // ── Supabase fallback (original implementation) ───────────────────────────
    console.log(`[DEPOSIT] Supabase fallback: user=${userId} ref=${reference}`);
    return processDepositViaSupabase(supabase, data);
}

// Original Supabase implementation preserved as the fallback.
// Once Core is stable in production, this function and the fallback
// logic above can be removed.
async function processDepositViaSupabase(supabase: SupabaseClient, data: DepositData) {
    const { userId, amount, walletCredit, fee, reference, externalReference, paymentType, description, metadata } = data;

    try {
        // 1. Idempotency check
        const { data: existingTx } = await supabase
            .from('transactions')
            .select('id')
            .eq('external_reference', externalReference)
            .single();

        if (existingTx) {
            console.log(`[DEPOSIT] Already processed (Supabase): ${externalReference}`);
            return { success: true, message: 'Already processed', alreadyProcessed: true };
        }

        // 2. Get current profile balance
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('balance, referred_by')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            throw new Error(`User profile not found: ${userId}`);
        }

        // 3. Atomic balance update
        const { error: balanceError } = await supabase.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: walletCredit,
            p_type: 'credit',
            p_description: description,
            p_reference: reference
        });

        if (balanceError) throw balanceError;

        // 4. Transaction record
        const { error: txError } = await supabase.from('transactions').insert({
            user_id: userId,
            type: 'deposit',
            amount: walletCredit,
            status: 'success',
            description,
            reference,
            external_reference: externalReference,
            response_data: {
                payment_type: paymentType,
                gross_amount: amount,
                fee_deducted: fee,
                source: 'supabase-fallback',
                ...metadata
            }
        });

        if (txError) throw txError;

        // 5. Notification
        await supabase.from('notifications').insert({
            user_id: userId,
            type: 'success',
            title: 'Wallet Funded! 💰',
            message: `₦${walletCredit.toLocaleString()} has been added to your wallet via ${paymentType.replace('_', ' ')}.`,
        });

        const newBalance = (profile.balance || 0) + walletCredit;
        console.log(`✅ [DEPOSIT] Supabase fallback success: user=${userId} new_balance=${newBalance}`);
        return { success: true, newBalance };

    } catch (error) {
        console.error('[DEPOSIT] Supabase fallback failed:', error);
        throw error;
    }
}
