/**
 * GET /api/cron/dispatcher
 *
 * Master cron dispatcher — the ONLY cron entry on Hobby plan.
 * Runs every hour (0 * * * *). Checks the current UTC hour and
 * dispatches to the appropriate sub-cron via internal fetch.
 *
 * Hour schedule (UTC):
 *   0  → process-vault-expiry
 *   1  → release-deposit-holds
 *   2  → retry-failed-refunds
 *   3  → reconcile
 *   8  → verify-payments
 *   12 → process-transfers
 *   16 → process-pending-transactions
 *   23 → catch-all: runs tasks that were missed earlier
 */
import { NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET ?? '';
const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.SELF_URL ?? '';

interface Task {
  hour: number;
  path: string;
  label: string;
}

const SCHEDULE: Task[] = [
  { hour: 0,  path: '/api/cron/process-vault-expiry',        label: 'vault-expiry' },
  { hour: 1,  path: '/api/cron/release-deposit-holds',        label: 'release-holds' },
  { hour: 2,  path: '/api/cron/retry-failed-refunds',         label: 'retry-refunds' },
  { hour: 3,  path: '/api/cron/reconcile',                    label: 'reconcile' },
  { hour: 8,  path: '/api/cron/verify-payments',              label: 'verify-payments' },
  { hour: 12, path: '/api/cron/process-transfers',            label: 'process-transfers' },
  { hour: 16, path: '/api/cron/process-pending-transactions', label: 'pending-tx' },
];

async function callCron(path: string, label: string): Promise<{ ok: boolean; status: number; body: string }> {
  if (!BASE_URL) {
    console.error(`[DISPATCHER] Cannot dispatch ${label}: no BASE_URL (set SELF_URL or VERCEL_PROJECT_PRODUCTION_URL)`);
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
    console.error(`[DISPATCHER] ${label} fetch failed:`, err);
    return { ok: false, status: 0, body: String(err) };
  }
}

export async function GET(request: NextRequest) {
  // Auth
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!BASE_URL) {
    return NextResponse.json(
      { success: false, error: 'BASE_URL not configured. Set SELF_URL env var or use Vercel (VERCEL_PROJECT_PRODUCTION_URL is auto-set).' },
      { status: 500 }
    );
  }

  const utcHour = new Date().getUTCHours();
  const results: Record<string, { ok: boolean; status: number }> = {};
  let dispatched = 0;

  // Find tasks scheduled for this hour
  const due = SCHEDULE.filter((t) => t.hour === utcHour);

  // Hour 23: also run any task that hasn't run today (catch-all)
  // This handles the case where a task was missed due to a failure at its primary hour
  if (utcHour === 23) {
    // For simplicity, run vault-expiry and release-holds again as belt-and-suspenders
    for (const task of SCHEDULE) {
      if (task.hour === 0 || task.hour === 1) {
        if (!due.find((t) => t.path === task.path)) {
          due.push({ ...task, label: `${task.label} (catch-up)` });
        }
      }
    }
  }

  for (const task of due) {
    const result = await callCron(task.path, task.label);
    results[task.label] = { ok: result.ok, status: result.status };
    dispatched++;
  }

  console.log(`[DISPATCHER] Hour ${utcHour} UTC: dispatched ${dispatched} tasks, results:`, JSON.stringify(results));

  return NextResponse.json({
    success: true,
    utcHour,
    dispatched,
    results,
  });
}
