/**
 * TADAPAY Core client — Next.js → Go Core internal HTTP bridge.
 *
 * All money movements (debit, refund, deposit, balance read) go through
 * this module. Never call Supabase directly for financial operations in
 * Next.js API routes — use these helpers instead.
 *
 * Environment variables required:
 *   CORE_URL     — URL of the Go Core service (default: http://localhost:8080)
 *   CORE_SECRET  — Shared bearer token (must match CORE_SECRET in Core .env)
 */

const CORE_URL = process.env.TADA_CORE_URL ?? process.env.CORE_URL ?? 'http://localhost:8080';
const CORE_SECRET = process.env.CORE_SECRET ?? '';

// ── Internal request helper ───────────────────────────────────────────────────

async function coreRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  if (!CORE_SECRET) {
    throw new Error('CORE_SECRET is not configured — set it in .env.local');
  }

  const res = await fetch(`${CORE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CORE_SECRET}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    // Disable Next.js fetch cache — Core calls must always be fresh
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

  if (!res.ok) {
    // Surface the Core error message as-is so callers can forward it to the client
    throw new Error((data as { error?: string }).error ?? `Core error ${res.status}`);
  }

  return data as T;
}

// ── Response types ─────────────────────────────────────────────────────────────

export interface CoreDepositResult {
  success: boolean;
  newBalance?: number;
  alreadyProcessed?: boolean;
}

export interface CoreDebitResult {
  success: boolean;
  newBalance: number;
  amountDebited: number;
}

export interface CoreRefundResult {
  success: boolean;
  newBalance: number;
}

export interface CoreBalanceResult {
  userId: string;
  balance: number;
}

// ── VTU operations ─────────────────────────────────────────────────────────────

/**
 * Credit a user's wallet — called after a successful Flutterwave payment.
 * Core handles idempotency: safe to call multiple times with the same reference.
 */
export async function coreDeposit(params: {
  userId: string;
  amount: number;
  walletCredit: number;
  fee: number;
  reference: string;
  externalReference: string;
  paymentType: string;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<CoreDepositResult> {
  return coreRequest<CoreDepositResult>('POST', '/ledger/deposit', params);
}

/**
 * Debit a user's wallet before calling a VTU provider.
 *
 * Core enforces:
 *   - No overdraft (rejects with 402 if balance < amount)
 *   - Idempotency (safe to retry with the same reference)
 *   - Atomic balance update via Supabase RPC
 *
 * Throws if the user doesn't exist, has insufficient funds, or Core is down.
 *
 * On throw, the caller MUST NOT call coreRefund — no debit occurred.
 * On success, the caller MUST call coreRefund if the provider later fails.
 */
export async function coreDebit(params: {
  userId: string;
  amount: number;
  reference: string;
  serviceType: string;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<CoreDebitResult> {
  return coreRequest<CoreDebitResult>('POST', '/ledger/debit', params);
}

/**
 * Refund a user after a failed VTU delivery.
 *
 * Core:
 *   - Credits the user's wallet atomically
 *   - Marks the original transaction as "failed"
 *   - Inserts a refund transaction record
 *   - Sends a wallet notification
 *
 * Always call this when a provider fails after a successful coreDebit.
 * It is idempotent — safe to retry with the same reference.
 */
export async function coreRefund(params: {
  userId: string;
  amount: number;
  reference: string;
  originalReference: string;
  description: string;
}): Promise<CoreRefundResult> {
  return coreRequest<CoreRefundResult>('POST', '/ledger/refund', params);
}

/**
 * Read a user's current wallet balance from Core.
 * Core reads from Supabase — this is always the authoritative balance.
 */
export async function coreBalance(userId: string): Promise<CoreBalanceResult> {
  return coreRequest<CoreBalanceResult>('GET', `/wallet/${userId}/balance`);
}
