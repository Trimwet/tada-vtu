/**
 * POST /api/eve/data
 *
 * Eve-internal data purchase route. Authenticated by CORE_SECRET header.
 * No PIN required — WhatsApp number linkage is the identity proof.
 */
import { NextRequest, NextResponse } from 'next/server';
import { purchaseData, ServiceUnavailableError } from '@/lib/api/inlomax';
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
    const { userId, network, phone, planId, planName, amount } = body;

    if (!userId || !network || !phone || !planId || !amount) {
      return NextResponse.json(
        { status: false, message: 'Missing required fields: userId, network, phone, planId, amount' },
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
    if (isNaN(numAmount) || numAmount < 50) {
      return NextResponse.json(
        { status: false, message: 'Amount must be at least ₦50' },
        { status: 400 }
      );
    }

    const reference = `EVE_DATA_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const description = `${network} ${planName || 'Data'} - ${phone} (WhatsApp)`;

    // Debit via Core
    let debitResult;
    try {
      debitResult = await coreDebit({
        userId,
        amount: numAmount,
        reference,
        serviceType: 'data',
        description,
        metadata: { network, phone, planId, planName, source: 'eve_whatsapp' },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('insufficient funds:')) {
        return NextResponse.json(
          { status: false, message: 'Insufficient balance to complete this purchase.' },
          { status: 400 }
        );
      }
      console.error('[EVE-DATA] Core debit failed:', err);
      return NextResponse.json(
        { status: false, message: 'Failed to debit wallet. Please try again.' },
        { status: 500 }
      );
    }

    // Call provider
    try {
      const result = await purchaseData({ serviceID: planId, phone });

      if (result.status === 'success' || result.status === 'processing') {
        return NextResponse.json({
          status: true,
          message: `✅ ${planName || 'Data bundle'} activated for ${phone} successfully.`,
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
      }).catch(e => console.error('[EVE-DATA] Refund failed:', e));

      return NextResponse.json({
        status: false,
        message: result.message || 'Data purchase failed. Your wallet has been refunded.',
      });

    } catch (err) {
      await coreRefund({
        userId,
        amount: numAmount,
        reference: `REFUND_${reference}`,
        originalReference: reference,
        description: `Refund: ${description}`,
      }).catch(e => console.error('[EVE-DATA] Refund failed:', e));

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
    console.error('[EVE-DATA] Unexpected error:', err);
    return NextResponse.json(
      { status: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
