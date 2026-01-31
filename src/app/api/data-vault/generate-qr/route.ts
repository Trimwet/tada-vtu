import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePersonalDataQR } from '@/lib/qr-generator';

export async function POST(request: NextRequest) {
  try {
    const { vaultId } = await request.json();

    if (!vaultId) {
      return NextResponse.json(
        { status: false, message: 'Vault ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { status: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get vault details
    const { data: vault, error: vaultError } = await supabase
      .from('data_vault')
      .select('*')
      .eq('id', vaultId)
      .eq('user_id', user.id)
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
      userId: user.id,
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
        user_id: user.id,
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