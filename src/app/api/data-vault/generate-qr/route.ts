import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePersonalDataQR } from '@/lib/qr-generator';

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
    const { vaultId, userId } = await request.json();

    if (!vaultId || !userId) {
      return NextResponse.json(
        { status: false, message: 'Vault ID and User ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get vault details
    const { data: vault, error: vaultError } = await supabase
      .from('data_vault')
      .select('*')
      .eq('id', vaultId)
      .eq('user_id', userId)
      .eq('status', 'parked')
      .single();

    if (vaultError || !vault) {
      return NextResponse.json(
        { status: false, message: 'Vault not found or already used' },
        { status: 404 }
      );
    }

    // Generate QR code
    const { qrCode, qrData } = await generatePersonalDataQR({
      vaultId: vault.id,
      userId: userId,
      network: vault.network,
      planSize: vault.plan_name,
      planName: vault.plan_name,
      amount: vault.amount,
      validDays: 7, // QR valid for 7 days
    });

    // Store QR data in database for tracking
    const { error: insertError } = await supabase
      .from('vault_qr_codes')
      .insert({
        id: qrData.id,
        vault_id: vault.id,
        user_id: userId,
        qr_data: qrData,
        expires_at: qrData.validUntil,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to store QR data:', insertError);
      // Continue anyway, QR will still work
    }

    return NextResponse.json({
      status: true,
      data: {
        qrCode,
        qrId: qrData.id,
        expiresAt: qrData.validUntil,
        vaultInfo: {
          network: vault.network,
          planSize: vault.plan_name,
          amount: vault.amount,
          phone: vault.phone_number,
        }
      }
    });

  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}