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

    // Calculate date range
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

    // Fetch transactions in date range
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, type, amount, status, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('status', 'success')
      .order('created_at', { ascending: true });

    // Fetch user signups in date range
    const { data: users } = await supabase
      .from('profiles')
      .select('id, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    // Process data for charts
    const dailyData = new Map<string, {
      date: string;
      revenue: number;
      deposits: number;
      airtime: number;
      data: number;
      bills: number;
      transactions: number;
      users: number;
    }>();

    // Initialize days
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyData.set(key, {
        date: key,
        revenue: 0,
        deposits: 0,
        airtime: 0,
        data: 0,
        bills: 0,
        transactions: 0,
        users: 0,
      });
    }

    // Process transactions
    transactions?.forEach(txn => {
      const day = txn.created_at.split('T')[0];
      const entry = dailyData.get(day);
      if (!entry) return;

      entry.transactions++;
      const amount = Math.abs(txn.amount);

      if (txn.type === 'deposit') {
        entry.deposits += amount;
        entry.revenue += Math.max(50, Math.ceil(amount * 0.01)); // Service fee
      } else if (txn.type === 'airtime') {
        entry.airtime += amount;
        entry.revenue += Math.round(amount * 0.025);
      } else if (txn.type === 'data') {
        entry.data += amount;
        entry.revenue += Math.round(amount * 0.05);
      } else if (['cable', 'electricity', 'betting'].includes(txn.type)) {
        entry.bills += amount;
        entry.revenue += Math.round(amount * 0.005);
      }
    });

    // Process user signups
    users?.forEach(user => {
      const day = user.created_at.split('T')[0];
      const entry = dailyData.get(day);
      if (entry) entry.users++;
    });

    // Convert to array
    const chartData = Array.from(dailyData.values());

    // Calculate hourly distribution (peak hours)
    const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: i, transactions: 0 }));
    transactions?.forEach(txn => {
      const hour = new Date(txn.created_at).getHours();
      hourlyData[hour].transactions++;
    });

    // Service breakdown
    const serviceBreakdown = {
      airtime: { count: 0, volume: 0, revenue: 0 },
      data: { count: 0, volume: 0, revenue: 0 },
      cable: { count: 0, volume: 0, revenue: 0 },
      electricity: { count: 0, volume: 0, revenue: 0 },
      betting: { count: 0, volume: 0, revenue: 0 },
      deposit: { count: 0, volume: 0, revenue: 0 },
    };

    transactions?.forEach(txn => {
      const type = txn.type as keyof typeof serviceBreakdown;
      if (serviceBreakdown[type]) {
        serviceBreakdown[type].count++;
        serviceBreakdown[type].volume += Math.abs(txn.amount);
        
        if (type === 'deposit') {
          serviceBreakdown[type].revenue += Math.max(50, Math.ceil(Math.abs(txn.amount) * 0.01));
        } else if (type === 'airtime') {
          serviceBreakdown[type].revenue += Math.round(Math.abs(txn.amount) * 0.025);
        } else if (type === 'data') {
          serviceBreakdown[type].revenue += Math.round(Math.abs(txn.amount) * 0.05);
        } else {
          serviceBreakdown[type].revenue += Math.round(Math.abs(txn.amount) * 0.005);
        }
      }
    });

    // Summary stats
    const summary = {
      totalRevenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
      totalDeposits: chartData.reduce((sum, d) => sum + d.deposits, 0),
      totalTransactions: chartData.reduce((sum, d) => sum + d.transactions, 0),
      newUsers: chartData.reduce((sum, d) => sum + d.users, 0),
      avgDailyRevenue: Math.round(chartData.reduce((sum, d) => sum + d.revenue, 0) / chartData.length),
      avgDailyTransactions: Math.round(chartData.reduce((sum, d) => sum + d.transactions, 0) / chartData.length),
      peakHour: hourlyData.reduce((max, h) => h.transactions > max.transactions ? h : max, hourlyData[0]).hour,
      topService: Object.entries(serviceBreakdown)
        .filter(([k]) => k !== 'deposit')
        .reduce((max, [k, v]) => v.volume > max.volume ? { name: k, ...v } : max, { name: '', count: 0, volume: 0, revenue: 0 }),
    };

    return NextResponse.json({
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      chartData,
      hourlyData,
      serviceBreakdown,
      summary,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
