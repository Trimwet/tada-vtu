/**
 * TADAPAY Core client — Next.js → Go Core internal HTTP bridge.
 *
 * All money movements (debit, refund, deposit, balance read) go through
 * this module. The Go Core is authoritative when running. If it is not
 * reachable (e.g. during development without the Core process, or during
 * the strangler-fig migration), every function falls back to direct
 * Supabase operations — the same atomics the Core itself uses.
 *
 * Environment variables required:
 *   CORE_URL / TADA_CORE_URL — URL of the Go Core service (default: http://localhost:8080)
 *   CORE_SECRET              — Shared bearer token
 *   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key for server-side ops
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CORE_URL = process.env.TADA_CORE_URL ?? process.env.CORE_URL ?? 'http://localhost:8080';
const CORE_SECRET = process.env.CORE_SECRET ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ── Supabase admin client ─────────────────────────────────────────────────────

function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── Core HTTP helper ──────────────────────────────────────────────────────────

async function coreRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  if (!CORE_SECRET) throw new Error('CORE_SECRET is not configured');

  const res = await fetch(`${CORE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CORE_SECRET}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
    // Short timeout — if Core is not running we fall back fast
    signal: AbortSignal.timeout(3000),
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Core error ${res.status}`);
  }
  return data as T;
}

/** True when the error indicates Core is unreachable (not a business logic error). */
function isCoreDown(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'TimeoutError') return true;
  if (err instanceof TypeError && err.message.includes('fetch failed')) return true;
  if (err instanceof Error) {
    return (
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('ENOTFOUND') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('core not configured')
    );
  }
  return false;
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

// ── Supabase fallback implementations ─────────────────────────────────────────

async function balanceViaSupabase(userId: string): Promise<CoreBalanceResult> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();

  if (error || !data) throw new Error(`profile not found: ${userId}`);
  return { userId, balance: data.balance ?? 0 };
}

async function debitViaSupabase(params: {
  userId: string;
  amount: number;
  reference: string;
  idempotencyKey?: string;
  serviceType: string;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<CoreDebitResult> {
  const sb = getSupabase();
  const idempotencyKey = params.idempotencyKey || params.reference;

  // Calls the SAME atomic_debit() Postgres function the Go Core uses
  // (migration 035) — idempotency check, balance lock, balance check,
  // balance update, and pending-transaction insert all happen inside one
  // DB transaction. This closes the TOCTOU race that existed in the old
  // check-balance-then-RPC flow below, where two concurrent calls could
  // both pass the balance check before either had debited.
  const { data, error } = await sb.rpc('atomic_debit', {
    p_idempotency_key: idempotencyKey,
    p_user_id: params.userId,
    p_amount: params.amount,
    p_description: params.description,
    p_reference: params.reference,
    p_service_type: params.serviceType,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('INSUFFICIENT_BALANCE')) {
      const m = msg.match(/balance=([\d.]+)\s+requested=([\d.]+)/);
      throw new Error(m ? `insufficient funds: balance ${m[1]}, requested ${m[2]}` : 'insufficient funds');
    }
    if (msg.includes('USER_NOT_FOUND')) {
      throw new Error(`profile not found: ${params.userId}`);
    }
    throw new Error(msg || 'atomic_debit failed');
  }

  return { success: true, newBalance: data.newBalance, amountDebited: data.amountDebited };
}

async function refundViaSupabase(params: {
  userId: string;
  amount: number;
  reference: string;
  idempotencyKey?: string;
  originalReference: string;
  description: string;
}): Promise<CoreRefundResult> {
  const sb = getSupabase();
  const idempotencyKey = params.idempotencyKey || params.reference;

  // Same atomic_refund() function the Go Core uses — credit, marking the
  // original transaction failed, and inserting the refund record all
  // happen inside one DB transaction.
  const { data, error } = await sb.rpc('atomic_refund', {
    p_idempotency_key: idempotencyKey,
    p_user_id: params.userId,
    p_amount: params.amount,
    p_description: params.description,
    p_reference: params.reference,
    p_original_reference: params.originalReference,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('USER_NOT_FOUND')) {
      throw new Error(`profile not found: ${params.userId}`);
    }
    throw new Error(msg || 'atomic_refund failed');
  }

  return { success: true, newBalance: data.newBalance };
}

async function depositViaSupabase(params: {
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
  const sb = getSupabase();

  // Calls the same atomic_deposit() Postgres function the Go Core uses
  // (migration 036) — idempotency check, FOR UPDATE balance lock, credit,
  // wallet_transactions audit row, transactions record, and idempotency cache
  // all happen inside one DB transaction. The idempotency key is
  // externalReference (the payment provider's stable unique ref) so concurrent
  // webhook retries are deduped at the DB level.
  const { data, error } = await sb.rpc('atomic_deposit', {
    p_idempotency_key:    params.externalReference,
    p_user_id:            params.userId,
    p_amount:             params.walletCredit,
    p_description:        params.description,
    p_reference:          params.reference,
    p_external_reference: params.externalReference,
    p_payment_type:       params.paymentType,
    p_gross_amount:       params.amount,
    p_fee:                params.fee,
    p_metadata:           params.metadata ?? {},
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('USER_NOT_FOUND')) {
      throw new Error(`profile not found: ${params.userId}`);
    }
    throw new Error(msg || 'atomic_deposit failed');
  }

  return {
    success:          true,
    newBalance:       data.newBalance,
    alreadyProcessed: data.alreadyProcessed ?? false,
  };
}

// ── Public API — Core first, Supabase fallback ────────────────────────────────

export async function coreBalance(userId: string): Promise<CoreBalanceResult> {
  try {
    return await coreRequest<CoreBalanceResult>('GET', `/wallet/${userId}/balance`);
  } catch (err) {
    if (isCoreDown(err)) {
      console.log('[CORE] Core unreachable — reading balance via Supabase');
      return balanceViaSupabase(userId);
    }
    throw err;
  }
}

export async function coreDebit(params: {
  userId: string;
  amount: number;
  reference: string;
  idempotencyKey?: string;
  serviceType: string;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<CoreDebitResult> {
  try {
    return await coreRequest<CoreDebitResult>('POST', '/ledger/debit', params);
  } catch (err) {
    if (isCoreDown(err)) {
      console.log('[CORE] Core unreachable — debiting via Supabase');
      return debitViaSupabase(params);
    }
    throw err;
  }
}

export async function coreRefund(params: {
  userId: string;
  amount: number;
  reference: string;
  idempotencyKey?: string;
  originalReference: string;
  description: string;
}): Promise<CoreRefundResult> {
  try {
    return await coreRequest<CoreRefundResult>('POST', '/ledger/refund', params);
  } catch (err) {
    if (isCoreDown(err)) {
      console.log('[CORE] Core unreachable — refunding via Supabase');
      return refundViaSupabase(params);
    }
    throw err;
  }
}

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
  try {
    return await coreRequest<CoreDepositResult>('POST', '/ledger/deposit', params);
  } catch (err) {
    if (isCoreDown(err)) {
      console.log('[CORE] Core unreachable — processing deposit via Supabase');
      return depositViaSupabase(params);
    }
    throw err;
  }
}
