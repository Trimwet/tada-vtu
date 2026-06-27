/**
 * POST /api/eve/airtime
 *
 * Eve-internal airtime purchase route. Authenticated by CORE_SECRET header
 * (x-core-secret), not by user JWT or reseller API key.
 *
 * No PIN required — the user is already authenticated via WhatsApp number
 * linkage. The WhatsApp number serves as the identity proof.
 */
import { NextRequest, NextResponse } from 'next/server';
import { purchaseAirtime, ServiceUnavailableError } from '@/lib/api/inlomax';
import { coreDebit, coreRefund } from '@/lib/api/core';

function verifyCoreSecret(request: NextRequest): boolean {
  const secret = process.env.CORE_SECRET;
  if (!secret) return false;
  return request.headers.get('x-core-secret') === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyCoreSecret(request)) {
    return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, network, phone, amount } = body;

    if (!userId || !network || !phone || !amount) {
      return NextResponse.json(
        { status: false, message: 'Missing required fields: userId, network, phone, amount' },
        { status: 400 }
      );
    }
    if (!/^0[789][01]\d{8}$/.test(phone)) {
      return NextResponse.json(
        { status: false, message: 'Invalid phone number format. Use: 08012345678' },
        { status: 400 }
      );
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 50 || numAmount > 50000) {
      return NextResponse.json(
        { status: false, message: 'Amount must be between ₦50 and ₦50,000' },
        { status: 400 }
      );
    }

    const reference = `EVE_AIR_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const description = `${network} ₦${numAmount} Airtime - ${phone} (WhatsApp)`;

    // Debit via Core (atomic, idempotent, no-overdraft enforced)
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId,
        amount: numAmount,
        reference,
        serviceType: 'airtime',
        description,
        metadata: { network, phone, source: 'eve_whatsapp' },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('insufficient funds:')) {
        return NextResponse.json(
          { status: false, message: 'Insufficient balance to complete this purchase.' },
          { status: 400 }
        );
      }
      console.error('[EVE-AIRTIME] Core debit failed:', err);
      return NextResponse.json(
        { status: false, message: 'Failed to debit wallet. Please try again.' },
        { status: 500 }
      );
    }

    // Call provider
    try {
      const result = await purchaseAirtime({ network, phone, amount: numAmount });

      if (result.status === 'success' || result.status === 'processing') {
        return NextResponse.json({
          status: true,
          message: `✅ ₦${numAmount} ${network} airtime sent to ${phone} successfully.`,
          data: { reference, newBalance: debitResult.newBalance },
        });
      }

      // Provider failed — refund
      await coreRefund({
        userId,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${description}`,
      }).catch(e => console.error('[EVE-AIRTIME] Refund failed:', e));

      return NextResponse.json({
        status: false,
        message: result.message || 'Airtime purchase failed. Your wallet has been refunded.',
      });

    } catch (err) {
      await coreRefund({
        userId,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${description}`,
      }).catch(e => console.error('[EVE-AIRTIME] Refund failed:', e));

      if (err instanceof ServiceUnavailableError) {
        return NextResponse.json(
          { status: false, message: 'Service temporarily unavailable. Your wallet has been refunded.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { status: false, message: 'Purchase failed. Your wallet has been refunded.' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('[EVE-AIRTIME] Unexpected error:', err);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
