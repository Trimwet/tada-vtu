import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePersonalQRData } from '@/lib/qr-generator';

export async function POST(request: NextRequest) {
  try {
    const { qrData, phoneNumber } = await request.json();

    if (!qrData || !phoneNumber) {
      return NextResponse.json(
        { status: false, message: 'QR data and phone number are required' },
        { status: 400 }
      );
    }

    // Parse and validate QR code
    const parsedQR = parsePersonalQRData(qrData);
    if (!parsedQR) {
      return NextResponse.json(
        { status: false, message: 'Invalid or expired QR code' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Check if QR has already been used
    const { data: existingQR } = await supabase
      .from('vault_qr_codes')
      .select('used_at')
      .eq('id', parsedQR.id)
      .single();

    if (existingQR?.used_at) {
      return NextResponse.json(
        { status: false, message: 'This QR code has already been used' },
        { status: 400 }
      );
    }

    // Get vault details using service role (no auth required)
    const { data: vault, error: vaultError } = await supabase
      .from('data_vault')
      .select('*')
      .eq('id', parsedQR.vaultId)
      .eq('status', 'parked')
      .single();

    if (vaultError || !vault) {
      return NextResponse.json(
        { status: false, message: 'Vault not found or already used' },
        { status: 404 }
      );
    }

    // Deliver the data directly using Inlomax API
    const planIdForPurchase = vault.plan_id;

    const inlomaxResponse = await fetch(`${process.env.INLOMAX_BASE_URL || 'https://inlomax.com'}/api/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INLOMAX_API_KEY}`,
      },
      body: JSON.stringify({
        network: vault.network,
        phone: phoneNumber,
        planId: planIdForPurchase,
        amount: vault.amount,
        planName: vault.plan_name,
      }),
    });

    const inlomaxResult = await inlomaxResponse.json();

    if (inlomaxResult.status) {
      // Mark vault as delivered
      await supabase
        .from('data_vault')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          recipient_phone: phoneNumber,
        })
        .eq('id', vault.id);

      // Mark QR as used
      await supabase
        .from('vault_qr_codes')
        .update({ 
          used_at: new Date().toISOString(),
          redeemed_phone: phoneNumber 
        })
        .eq('id', parsedQR.id);

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: vault.user_id,
          type: 'data',
          amount: vault.amount,
          phone_number: phoneNumber,
          network: vault.network,
          status: 'success',
          reference: `qr_${parsedQR.id}_${Date.now()}`,
          external_reference: inlomaxResult.reference,
          description: `${vault.plan_name} ${vault.network} data delivered via QR code`,
          response_data: inlomaxResult,
        });

      return NextResponse.json({
        status: true,
        message: `${parsedQR.planSize} ${parsedQR.network} data delivered to ${phoneNumber}`,
        data: {
          network: parsedQR.network,
          planSize: parsedQR.planSize,
          phoneNumber: phoneNumber,
          deliveredAt: new Date().toISOString(),
          reference: inlomaxResult.reference,
        }
      });
    } else {
      return NextResponse.json(
        { status: false, message: inlomaxResult.message || 'Failed to deliver data' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('QR redemption error:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to redeem QR code' },
      { status: 500 }
    );
  }
}