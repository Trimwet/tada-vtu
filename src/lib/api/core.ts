/**
 * Core API client — Next.js side.
 *
 * This is the ONLY file in Next.js that is allowed to call the Go financial
 * core. All VTU purchase routes import from here.
 *
 * Core runs at localhost:8080 in development and at CORE_URL in production.
 */

const CORE_URL = process.env.CORE_URL || 'http://localhost:8080';
const CORE_SECRET = process.env.CORE_SECRET || 'tada-core-dev-secret-change-in-production';

function coreHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${CORE_SECRET}`,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoreDebitParams {
  userId: string;
  amount: number;
  reference: string;
  serviceType: 'airtime' | 'data' | 'cable' | 'electricity';
  description: string;
  metadata?: Record<string, unknown>;
}

export interface CoreDebitResult {
  success: boolean;
  newBalance: number;
  amountDebited: number;
}

export interface CoreRefundParams {
  userId: string;
  amount: number;
  reference: string;       // new refund ref e.g. REFUND_TADA_AIR_xxx
  originalReference: string; // the debit ref being reversed
  description: string;
}

export interface CoreRefundResult {
  success: boolean;
  newBalance: number;
}

export interface CoreBalanceResult {
  userId: string;
  balance: number;
}

// ─── Debit ────────────────────────────────────────────────────────────────────

/**
 * Deducts from a user's wallet for a VTU purchase.
 * Core enforces: idempotency, balance check, atomic debit, transaction record.
 *
 * Throws with message "insufficient funds: ..." when balance is too low.
 * Caller should catch this and return a 400 to the user.
 */
export async function coreDebit(params: CoreDebitParams): Promise<CoreDebitResult> {
  const res = await fetch(`${CORE_URL}/ledger/debit`, {
    method: 'POST',
    headers: coreHeaders(),
    body: JSON.stringify(params),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Core debit failed');
  }

  return data as CoreDebitResult;
}

// ─── Refund ───────────────────────────────────────────────────────────────────

/**
 * Credits a user's wallet back after a failed VTU delivery.
 * Always call this when a provider returns an error after a successful debit.
 *
 * Non-throwing — logs on failure but does not propagate, because the user
 * has already been debited. Callers must log and alert if this returns false.
 */
export async function coreRefund(params: CoreRefundParams): Promise<CoreRefundResult | null> {
  try {
    const res = await fetch(`${CORE_URL}/ledger/refund`, {
      method: 'POST',
      headers: coreHeaders(),
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[CORE] Refund failed — MANUAL INTERVENTION REQUIRED:', params, data);
      return null;
    }

    return data as CoreRefundResult;
  } catch (err) {
    console.error('[CORE] Refund network error — MANUAL INTERVENTION REQUIRED:', params, err);
    return null;
  }
}

// ─── Balance ──────────────────────────────────────────────────────────────────

/**
 * Reads a user's current wallet balance from Core.
 * Use this instead of querying Supabase profiles.balance directly.
 */
export async function coreBalance(userId: string): Promise<CoreBalanceResult> {
  const res = await fetch(`${CORE_URL}/wallet/${userId}/balance`, {
    method: 'GET',
    headers: coreHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Balance check failed');
  }

  return data as CoreBalanceResult;
}
