import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase configuration');
    }

    return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { vaultId, userId } = body;

        if (!vaultId || !userId) {
            return NextResponse.json(
                { status: false, message: 'Vault ID and User ID are required' },
                { status: 400 }
            );
        }

        // Rate limiting
        const identifier = userId || request.headers.get('x-forwarded-for') || 'anonymous';
        const rateLimit = checkRateLimit(`vault-refund:${identifier}`, RATE_LIMITS.transaction);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { status: false, message: `Too many requests. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
                { status: 429 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Get vault item
        const { data: vaultItem, error: vaultError } = await supabase
            .from('data_vault')
            .select('*')
            .eq('id', vaultId)
            .eq('user_id', userId)
            .single();

        if (vaultError || !vaultItem) {
            console.error('Vault item fetch error:', vaultError);
            return NextResponse.json(
                { status: false, message: 'Vault item not found' },
                { status: 404 }
            );
        }

        // Check if item is ready for refund
        if (vaultItem.status !== 'ready') {
            return NextResponse.json(
                { status: false, message: `This item cannot be refunded as it is already ${vaultItem.status}` },
                { status: 400 }
            );
        }

        try {
            // Update vault item status
            const { error: updateVaultError } = await supabase
                .from('data_vault')
                .update({
                    status: 'refunded',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', vaultId);

            if (updateVaultError) {
                throw new Error('Failed to update vault status');
            }

            // Refund the user balance using the RPC function
            const { error: refundError } = await supabase.rpc('update_user_balance', {
                p_user_id: userId,
                p_amount: vaultItem.amount,
                p_type: 'credit',
                p_description: `Data Vault Refund: ${vaultItem.plan_name} for ${vaultItem.recipient_phone}`,
                p_reference: `VAULT_REFUND_${Date.now()}`
            });

            if (refundError) {
                console.error('Refund error:', refundError);
                // Attempt to rollback vault status if refund fails
                await supabase
                    .from('data_vault')
                    .update({ status: 'ready' })
                    .eq('id', vaultId);

                throw new Error('Failed to refund balance');
            }

            // Update original transaction status
            if (vaultItem.transaction_id) {
                await supabase
                    .from('transactions')
                    .update({ status: 'refunded' })
                    .eq('id', vaultItem.transaction_id);
            }

            // Create success notification
            await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    title: 'Data Vault Refunded',
                    message: `₦${vaultItem.amount.toLocaleString()} has been returned to your wallet.`,
                    type: 'info',
                });

            return NextResponse.json({
                status: true,
                message: 'Data plan refunded successfully to your wallet.',
            });

        } catch (processError) {
            console.error('[DATA-VAULT] Refund process error:', processError);
            return NextResponse.json(
                { status: false, message: 'Failed to process refund. Please try again or contact support.' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('[DATA-VAULT] Unexpected error:', error);
        return NextResponse.json(
            { status: false, message: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
