import { NextRequest, NextResponse } from 'next/server';

function verifyToken(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

const FW_BASE = 'https://api.flutterwave.com/v3';

async function fwGet(path: string, secretKey: string) {
  const res = await fetch(`${FW_BASE}${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    next: { revalidate: 0 },
  });
  return res.json();
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth || !verifyToken(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'Missing FW key' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';

  try {
    const [settlements, transactions] = await Promise.all([
      fwGet(`/settlements?page=${page}&per_page=20`, secretKey),
      fwGet(`/transactions?page=${page}&per_page=20`, secretKey),
    ]);

    // Extract charges from transactions (app_fee field)
    const charges = (transactions.data || [])
      .filter((t: Record<string, unknown>) => Number(t.app_fee) > 0)
      .map((t: Record<string, unknown>) => ({
        id: t.id,
        tx_ref: t.tx_ref,
        amount: t.amount,
        app_fee: t.app_fee,
        currency: t.currency,
        status: t.status,
        customer: (t.customer as Record<string, unknown>)?.email,
        created_at: t.created_at,
      }));

    return NextResponse.json({
      settlements: settlements.data || [],
      transactions: transactions.data || [],
      charges,
      meta: {
        settlements: settlements.meta,
        transactions: transactions.meta,
      },
    });
  } catch (err) {
    console.error('FW history error:', err);
    return NextResponse.json({ error: 'Failed to fetch Flutterwave history' }, { status: 500 });
  }
}
