import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createSupabaseClient(url, serviceKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vaultId: string }> }
) {
  try {
    const { vaultId } = await params;

    const supabaseClient = await createClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Security check: Verify userId matches authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ status: false, message: 'Unauthorized: User ID mismatch' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ status: false, message: 'userId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: vault, error } = await supabase
      .from('data_vault')
      .select('*, transactions!data_vault_transaction_id_fkey(*)')
      .eq('id', vaultId)
      .eq('user_id', userId)
      .single();

    if (error || !vault) {
      return NextResponse.json({ status: false, message: 'Vault not found' }, { status: 404 });
    }

    const receipt = {
      receiptId: `TADA-${vault.id.slice(0, 8).toUpperCase()}`,
      vaultId: vault.id,
      network: vault.network,
      planName: vault.plan_name,
      amount: vault.amount,
      recipientPhone: vault.recipient_phone,
      status: vault.status,
      parkedAt: vault.purchased_at,
      deliveredAt: vault.delivered_at || null,
      deliveryReference: vault.delivery_reference || null,
      transactionReference: vault.transactions?.reference || null,
      generatedAt: new Date().toISOString(),
      platform: 'TADA VTU',
      website: 'https://tadavtu.com',
    };

    return NextResponse.json({ status: true, data: receipt });
  } catch (error) {
    console.error('[RECEIPT]', error);
    return NextResponse.json({ status: false, message: 'Unexpected error' }, { status: 500 });
  }
}
