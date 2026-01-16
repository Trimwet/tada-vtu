import { SupabaseClient } from '@supabase/supabase-js';
import { calculateWalletCreditFromTransfer } from './flutterwave';

export interface DepositData {
    userId: string;
    amount: number; // The gross amount from Flutterwave
    walletCredit: number; // The net amount to credit user
    fee: number; // The fee deducted
    reference: string;
    externalReference: string;
    paymentType: string;
    description: string;
    metadata?: any;
}

// Calculate deposit amounts from transfer (used by webhook)
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

export async function processDeposit(supabase: SupabaseClient, data: DepositData) {
    const { userId, amount, walletCredit, fee, reference, externalReference, paymentType, description, metadata } = data;

    console.log(`🚀 [DEPOSIT-ENGINE] Initializing credit for user ${userId}`);
    console.log(`   - Type: ${paymentType}`);
    console.log(`   - Reference: ${reference}`);
    console.log(`   - Amount: ₦${amount} (Net: ₦${walletCredit}, Fee: ₦${fee})`);

    try {
        // 1. Check for existing transaction to prevent double-crediting
        const { data: existingTx } = await supabase
            .from('transactions')
            .select('id')
            .eq('external_reference', externalReference)
            .single();

        if (existingTx) {
            console.log(`[DEPOSIT-PROCESSOR] Deposit already processed: ${externalReference}`);
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

        // 3. Update Balance (Atomic Update preferred if RPC exists, otherwise standard update)
        const newBalance = (profile.balance || 0) + walletCredit;
        const { error: balanceError } = await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);

        if (balanceError) throw balanceError;

        // 4. Create Transaction Record
        const { error: txError } = await supabase.from('transactions').insert({
            user_id: userId,
            type: 'deposit',
            amount: walletCredit,
            status: 'success',
            description: description,
            reference,
            external_reference: externalReference,
            response_data: {
                payment_type: paymentType,
                gross_amount: amount,
                fee_deducted: fee,
                ...metadata
            }
        });

        if (txError) throw txError;

        // 5. Create Notification
        await supabase.from('notifications').insert({
            user_id: userId,
            type: 'success',
            title: 'Wallet Funded! 💰',
            message: `₦${walletCredit.toLocaleString()} has been added to your wallet via ${paymentType.replace('_', ' ')}.`,
        });

        console.log(`✅ [DEPOSIT-ENGINE] Success! User ${userId} balance updated (+₦${walletCredit})`);

        return { success: true, newBalance };

    } catch (error) {
        console.error('[DEPOSIT-PROCESSOR] Critical Error processing deposit:', error);
        throw error;
    }
}
