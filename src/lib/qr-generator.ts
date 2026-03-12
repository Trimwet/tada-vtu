import QRCode from 'qrcode';
import { createHash } from 'crypto';

export interface PersonalDataQR {
  id: string;
  type: 'personal_data';
  vaultId: string;
  network: string;
  planSize: string;
  planName: string;
  amount: number;
  validUntil: string;
  signature: string;
  ownerId: string;
}

// Generate signature for QR code security
function generateSignature(data: any): string {
  const secret = process.env.QR_SECRET_KEY || 'tada-vtu-qr-secret';
  const payload = JSON.stringify(data);
  return createHash('sha256').update(payload + secret).digest('hex').substring(0, 16);
}

// Verify QR code signature
export function verifyQRSignature(qrData: any): boolean {
  const { signature, ...data } = qrData;
  const expectedSignature = generateSignature(data);
  return signature === expectedSignature;
}

// Generate QR code for personal data vault
export async function generatePersonalDataQR(params: {
  vaultId: string;
  userId: string;
  network: string;
  planSize: string;
  planName: string;
  amount: number;
  validDays?: number;
}): Promise<{ qrCode: string; qrData: PersonalDataQR }> {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + (params.validDays || 7)); // Default 7 days

  const qrData: PersonalDataQR = {
    id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'personal_data',
    vaultId: params.vaultId,
    network: params.network,
    planSize: params.planSize,
    planName: params.planName,
    amount: params.amount,
    validUntil: validUntil.toISOString(),
    signature: '',
    ownerId: params.userId,
  };

  // Generate signature
  qrData.signature = generateSignature({
    id: qrData.id,
    type: qrData.type,
    vaultId: qrData.vaultId,
    network: qrData.network,
    planSize: qrData.planSize,
    planName: qrData.planName,
    amount: qrData.amount,
    validUntil: qrData.validUntil,
    ownerId: qrData.ownerId,
  });

  // Create QR code URL for personal use
  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tadavtu.com'}/vault/qr/${Buffer.from(JSON.stringify(qrData)).toString('base64')}`;
  
  // Generate QR code image with TADA VTU branding
  const qrCode = await QRCode.toDataURL(qrUrl, {
    width: 400,
    margin: 3,
    color: {
      dark: '#22c55e', // TADA VTU green
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M'
  });

  return { qrCode, qrData };
}

// Parse QR code data for personal vault
export function parsePersonalQRData(base64Data: string): PersonalDataQR | null {
  try {
    console.log('[QR-PARSE] Attempting to parse QR data, length:', base64Data?.length);
    
    const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
    const qrData = JSON.parse(jsonString) as PersonalDataQR;
    
    console.log('[QR-PARSE] Decoded QR data:', {
      id: qrData.id,
      type: qrData.type,
      vaultId: qrData.vaultId,
      network: qrData.network,
      validUntil: qrData.validUntil,
      hasSignature: !!qrData.signature
    });
    
    // Verify it's a personal data QR
    if (qrData.type !== 'personal_data') {
      console.error('[QR-PARSE] Invalid QR type:', qrData.type);
      throw new Error('Invalid QR code type');
    }

    // Verify signature
    const signatureValid = verifyQRSignature(qrData);
    console.log('[QR-PARSE] Signature verification:', signatureValid);
    
    if (!signatureValid) {
      console.error('[QR-PARSE] Signature verification failed');
      throw new Error('Invalid QR code signature');
    }

    // Check expiry
    const now = new Date();
    const expiryDate = new Date(qrData.validUntil);
    const isExpired = now > expiryDate;
    
    console.log('[QR-PARSE] Expiry check:', {
      now: now.toISOString(),
      validUntil: expiryDate.toISOString(),
      isExpired
    });
    
    if (isExpired) {
      console.error('[QR-PARSE] QR code has expired');
      throw new Error('QR code has expired');
    }

    console.log('[QR-PARSE] QR validation successful');
    return qrData;
  } catch (error) {
    console.error('[QR-PARSE] Failed to parse personal QR data:', error);
    return null;
  }
}