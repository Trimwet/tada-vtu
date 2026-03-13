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
      .eq('status', 'ready')
      .single();

    if (vaultError || !vault) {
      return NextResponse.json(
        { status: false, message: 'Vault not found or already used' },
        { status: 404 }
      );
    }

    // Check if QR code already exists for this vault and hasn't expired
    const { data: existingQR } = await supabase
      .from('vault_qr_codes')
      .select('*')
      .eq('vault_id', vaultId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingQR) {
      // Return existing QR code - check if qrCode is stored or needs regeneration
      const storedQrCode = existingQR.qr_data?.qrCode;
      
      if (storedQrCode) {
        // Return stored QR code
        console.log('Returning stored QR code');
        return NextResponse.json({
          status: true,
          data: {
            qrCode: storedQrCode,
            qrId: existingQR.qr_data.id,
            qrData: existingQR.qr_data, // Include the full QR data
            expiresAt: existingQR.expires_at,
            vaultInfo: {
              network: vault.network,
              plan_name: vault.plan_name,
              amount: vault.amount,
              phone_number: vault.recipient_phone,
            },
            isExisting: true,
          },
        });
      }
      
      // Old QR code without stored image - regenerate from qr_data
      console.log('Regenerating QR code from stored data');
      const { qrCode } = await generatePersonalDataQR({
        vaultId: vault.id,
        userId: userId,
        network: vault.network,
        planSize: vault.plan_name,
        planName: vault.plan_name,
        amount: vault.amount,
        validDays: 7,
      });
      
      return NextResponse.json({
        status: true,
        data: {
          qrCode,
          qrId: existingQR.qr_data.id,
          qrData: existingQR.qr_data, // Include the full QR data
          expiresAt: existingQR.expires_at,
          vaultInfo: {
            network: vault.network,
            plan_name: vault.plan_name,
            amount: vault.amount,
            phone_number: vault.recipient_phone,
          },
          isExisting: true,
        },
      });
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
    // Include qrCode in the qr_data for easy retrieval
    const qrDataWithCode = {
      ...qrData,
      qrCode: qrCode // Store the image data for later retrieval
    };
    
    const { error: insertError } = await supabase
      .from('vault_qr_codes')
      .insert({
        id: qrData.id,
        vault_id: vault.id,
        user_id: userId,
        qr_data: qrDataWithCode,
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
        qrData: qrData, // Include the full QR data for base64 encoding
        expiresAt: qrData.validUntil,
        vaultInfo: {
          network: vault.network,
          planSize: vault.plan_name,
          amount: vault.amount,
          phone: vault.recipient_phone,
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