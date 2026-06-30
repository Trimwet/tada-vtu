/**
 * GET /api/cron/dispatcher
 *
 * Master cron dispatcher — runs once daily at 00:00 UTC (Hobby limit).
 * Executes all 7 sub-cron tasks sequentially via internal fetch.
 *
 * Runs:
 *   process-vault-expiry, release-deposit-holds, retry-failed-refunds,
 *   reconcile, verify-payments, process-transfers, process-pending-transactions
 */
import { NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET ?? '';
const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.SELF_URL ?? '';

const TASKS: { path: string; label: string }[] = [
  { path: '/api/cron/process-vault-expiry',        label: 'vault-expiry' },
  { path: '/api/cron/release-deposit-holds',        label: 'release-holds' },
  { path: '/api/cron/retry-failed-refunds',         label: 'retry-refunds' },
  { path: '/api/cron/reconcile',                    label: 'reconcile' },
  { path: '/api/cron/verify-payments',              label: 'verify-payments' },
  { path: '/api/cron/process-transfers',            label: 'process-transfers' },
  { path: '/api/cron/process-pending-transactions', label: 'pending-tx' },
];

async function callCron(path: string, label: string): Promise<{ ok: boolean; status: number; body: string }> {
  if (!BASE_URL) {
    console.error(`[DISPATCHER] Cannot dispatch ${label}: no BASE_URL`);
    return { ok: false, status: 0, body: 'BASE_URL not configured' };
  }
  try {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
      signal: AbortSignal.timeout(25_000),
    });
    const body = await res.text().catch(() => '(no body)');
    if (!res.ok) {
      console.error(`[DISPATCHER] ${label} returned ${res.status}: ${body.slice(0, 200)}`);
    }
    return { ok: res.ok, status: res.status, body: body.slice(0, 500) };
  } catch (err) {
    console.error(`[DISPATCHER] ${label} failed:`, err);
    return { ok: false, status: 0, body: String(err) };
  }
}

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!BASE_URL) {
    return NextResponse.json(
      { success: false, error: 'BASE_URL not configured. Set SELF_URL env var or use Vercel (auto-set on Pro).' },
      { status: 500 }
    );
  }

  const results: Record<string, { ok: boolean; status: number }> = {};

  for (const task of TASKS) {
    const result = await callCron(task.path, task.label);
    results[task.label] = { ok: result.ok, status: result.status };
  }

  console.log(`[DISPATCHER] Daily run complete:`, JSON.stringify(results));

  return NextResponse.json({
    success: true,
    tasks: TASKS.length,
    results,
  });
}
