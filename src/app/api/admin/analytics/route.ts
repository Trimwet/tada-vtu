import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function verifyToken(token: string): { valid: boolean; adminId?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) return { valid: false };
    return { valid: true, adminId: payload.id };
  } catch {
    return { valid: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { valid, adminId } = verifyToken(authHeader.split(' ')[1]);
    if (!valid || !adminId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const customStart = searchParams.get('start');
    const customEnd = searchParams.get('end');

    // Calculate current date range
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (range) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'custom':
        startDate = customStart ? new Date(customStart) : new Date(now.setDate(now.getDate() - 7));
        endDate = customEnd ? new Date(customEnd) : new Date();
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }

    // Calculate previous date range for trends
    const duration = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate);
    const previousStartDate = new Date(startDate.getTime() - duration);

    // Helper to fetch data for a period
    async function getPeriodData(start: Date, end: Date) {
      const { data: txns } = await supabase
        .from('transactions')
        .select('type, amount, status, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'success');

      const { data: newUsers } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      let estimatedEarnings = 0; // Renamed
      let deposits = 0;
      let purchaseVolume = 0; // NEW
      const transactions = txns?.length || 0;
      const users = newUsers?.length || 0;

      txns?.forEach(txn => {
        const amount = Math.abs(txn.amount);
        if (txn.type === 'deposit') {
          deposits += amount;
          estimatedEarnings += Math.max(50, Math.ceil(amount * 0.01));
        } else if (txn.type === 'airtime') {
          estimatedEarnings += Math.round(amount * 0.025);
          purchaseVolume += amount;
        } else if (txn.type === 'data') {
          estimatedEarnings += Math.round(amount * 0.05);
          purchaseVolume += amount;
        } else {
          estimatedEarnings += Math.round(amount * 0.005);
          purchaseVolume += amount;
        }
      });

      const grossVolume = deposits + purchaseVolume;

      return { estimatedEarnings, deposits, grossVolume, transactions, users, txns };
    }

    const [currentStats, previousStats] = await Promise.all([
      getPeriodData(startDate, endDate),
      getPeriodData(previousStartDate, previousEndDate)
    ]);

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const trends = {
      estimatedEarnings: calculateTrend(currentStats.estimatedEarnings, previousStats.estimatedEarnings),
      deposits: calculateTrend(currentStats.deposits, previousStats.deposits),
      grossVolume: calculateTrend(currentStats.grossVolume, previousStats.grossVolume),
      transactions: calculateTrend(currentStats.transactions, previousStats.transactions),
      users: calculateTrend(currentStats.users, previousStats.users),
    };

    // --- Generate Daily Breakdown from Current Stats (same as before but using currentStats.txns) ---
    // (We reconstruct the detailed charts only for the current period)
    const dailyData = new Map<string, any>();
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < dayCount; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyData.set(key, { date: key, estimatedEarnings: 0, deposits: 0, grossVolume: 0, airtime: 0, data: 0, bills: 0, transactions: 0, users: 0 });
    }

    currentStats.txns?.forEach(txn => {
      const day = txn.created_at.split('T')[0];
      const entry = dailyData.get(day);
      if (!entry) return;
      entry.transactions++;
      const amount = Math.abs(txn.amount);

      if (txn.type === 'deposit') {
        entry.deposits += amount;
        entry.estimatedEarnings += Math.max(50, Math.ceil(amount * 0.01));
      } else if (txn.type === 'airtime') {
        entry.airtime += amount;
        entry.estimatedEarnings += Math.round(amount * 0.025);
      } else if (txn.type === 'data') {
        entry.data += amount;
        entry.estimatedEarnings += Math.round(amount * 0.05);
      } else {
        entry.bills += amount;
        entry.estimatedEarnings += Math.round(amount * 0.005);
      }
      entry.grossVolume = entry.deposits + entry.airtime + entry.data + entry.bills;
    });

    // Re-query users just to map them to days (optimized: we could have done this in getPeriodData but keeping it simple)
    const { data: userList } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    userList?.forEach(u => {
      const day = u.created_at.split('T')[0];
      const entry = dailyData.get(day);
      if (entry) entry.users++;
    });

    const chartData = Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Service Breakdown
    const serviceBreakdownMap = { airtime: 0, data: 0, cable: 0, electricity: 0, betting: 0, deposit: 0 };
    currentStats.txns?.forEach(txn => {
      const type = txn.type as keyof typeof serviceBreakdownMap;
      if (serviceBreakdownMap[type] !== undefined) serviceBreakdownMap[type] += Math.abs(txn.amount);
    });

    const serviceBreakdown = Object.entries(serviceBreakdownMap)
      .filter(([k, v]) => k !== 'deposit' && v > 0)
      .map(([name, value]) => ({ name, value }));

    return NextResponse.json({
      summary: {
        totalEstimatedEarnings: currentStats.estimatedEarnings,
        totalDeposits: currentStats.deposits,
        totalGrossVolume: currentStats.grossVolume,
        totalTransactions: currentStats.transactions,
        newUsers: currentStats.users,
        trends
      },
      chartData,
      serviceBreakdown,
      range
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
