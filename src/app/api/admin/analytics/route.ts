import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { valid, adminId } = verifyToken(authHeader.split(' ')[1]);
    if (!valid || !adminId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const now = new Date();

    if (period === 'custom' && startDate && endDate) {
      dateFilter = `created_at >= '${startDate}' AND created_at <= '${endDate}'`;
    } else if (period === 'day') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = `created_at >= '${today.toISOString()}'`;
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = `created_at >= '${weekAgo.toISOString()}'`;
    } else if (period === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = `created_at >= '${monthStart.toISOString()}'`;
    } else if (period === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      dateFilter = `created_at >= '${yearStart.toISOString()}'`;
    }

    // Fetch transactions with response_data for accurate margin calculations
    let query = supabase
      .from('transactions')
      .select('type, amount, status, created_at, network, response_data');

    let allTxnQuery = supabase
      .from('transactions')
      .select('type, amount, status, created_at');

    if (dateFilter) {
      const [field, operator, value] = dateFilter.split(' ');
      if (operator === '>=') {
        query = query.gte('created_at', value.replace(/'/g, ''));
        allTxnQuery = allTxnQuery.gte('created_at', value.replace(/'/g, ''));
      }
    }

    const { data: transactions, error: txnError } = await query;
    const { data: allTransactions, error: allTxnError } = await allTxnQuery;

    if (txnError) {
      console.error('Transaction fetch error:', txnError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const analytics = {
      period,
      startDate: startDate || (dateFilter ? dateFilter.split("'")[1] : null),
      endDate: endDate || now.toISOString(),

      revenue: {
        totalDeposits: 0,
        depositFees: 0,
        airtimeRevenue: 0,
        airtimeMargin: 0,
        dataRevenue: 0,
        dataMargin: 0,
        cableRevenue: 0,
        cableMargin: 0,
        electricityRevenue: 0,
        electricityMargin: 0,
        totalMargins: 0,
        totalRevenue: 0,
        netProfit: 0,
      },

      costs: {
        airtimeCost: 0,
        dataCost: 0,
        cableCost: 0,
        electricityCost: 0,
        flutterwaveFees: 0,
        totalCosts: 0,
      },

      volume: {
        totalTransactions: 0,
        depositCount: 0,
        airtimeCount: 0,
        dataCount: 0,
        cableCount: 0,
        electricityCount: 0,
        withdrawalCount: 0,
        totalWithdrawals: 0,
      },

      networks: {
        MTN: { count: 0, volume: 0, revenue: 0 },
        AIRTEL: { count: 0, volume: 0, revenue: 0 },
        GLO: { count: 0, volume: 0, revenue: 0 },
        '9MOBILE': { count: 0, volume: 0, revenue: 0 },
      },

      daily: [] as Array<{
        date: string;
        deposits: number;
        purchases: number;
        revenue: number;
        transactions: number;
      }>,

      hourly: [] as Array<{
        hour: number;
        transactions: number;
        revenue: number;
      }>,

      statusBreakdown: {
        success: { count: 0, volume: 0, amount: 0 },
        pending: { count: 0, volume: 0, amount: 0 },
        failed: { count: 0, volume: 0, amount: 0 },
      } as Record<string, { count: number; volume: number; amount: number }>,
    };

    const dailyMap = new Map<string, any>();
    const hourlyMap = new Map<number, any>();

    transactions?.forEach((txn) => {
      const amount = Math.abs(txn.amount);
      const date = new Date(txn.created_at);
      const dateKey = date.toISOString().split('T')[0];
      const hour = date.getHours();

      analytics.volume.totalTransactions++;

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          deposits: 0,
          purchases: 0,
          revenue: 0,
          transactions: 0,
        });
      }
      const dayData = dailyMap.get(dateKey);
      dayData.transactions++;

      const isToday = dateKey === now.toISOString().split('T')[0];
      if (isToday) {
        if (!hourlyMap.has(hour)) {
          hourlyMap.set(hour, { hour, transactions: 0, revenue: 0 });
        }
        const hourData = hourlyMap.get(hour);
        hourData.transactions++;
      }

      // Calculate actual margin using response_data.data.amount when available
      const inlomaxCost = txn.response_data?.data?.amount ? Number(txn.response_data.data.amount) : null;

      if (txn.type === 'deposit') {
        analytics.revenue.totalDeposits += amount;
        analytics.volume.depositCount++;

        const fee = Math.max(20, Math.ceil(amount * 0.01));
        analytics.revenue.depositFees += fee;

        dayData.deposits += amount;
        dayData.revenue += fee;

        if (isToday) hourlyMap.get(hour).revenue += fee;

        analytics.costs.flutterwaveFees += Math.ceil(amount * 0.01);

      } else if (txn.type === 'airtime') {
        analytics.revenue.airtimeRevenue += amount;
        analytics.volume.airtimeCount++;

        const actualCost = inlomaxCost !== null ? inlomaxCost : Math.round(amount * 0.975);
        const margin = amount - actualCost;
        analytics.revenue.airtimeMargin += margin;
        analytics.costs.airtimeCost += actualCost;

        dayData.purchases += amount;
        dayData.revenue += margin;

        if (isToday) hourlyMap.get(hour).revenue += margin;

        if (txn.network && analytics.networks[txn.network as keyof typeof analytics.networks]) {
          analytics.networks[txn.network as keyof typeof analytics.networks].count++;
          analytics.networks[txn.network as keyof typeof analytics.networks].volume += amount;
          analytics.networks[txn.network as keyof typeof analytics.networks].revenue += margin;
        }

      } else if (txn.type === 'data') {
        analytics.revenue.dataRevenue += amount;
        analytics.volume.dataCount++;

        // Use actual Inlomax cost from response_data, or estimate flat ₦20 markup
        const actualCost = inlomaxCost !== null ? inlomaxCost : (amount - 20);
        const margin = amount - actualCost;
        analytics.revenue.dataMargin += margin;
        analytics.costs.dataCost += actualCost;

        dayData.purchases += amount;
        dayData.revenue += margin;

        if (isToday) hourlyMap.get(hour).revenue += margin;

        if (txn.network && analytics.networks[txn.network as keyof typeof analytics.networks]) {
          analytics.networks[txn.network as keyof typeof analytics.networks].count++;
          analytics.networks[txn.network as keyof typeof analytics.networks].volume += amount;
          analytics.networks[txn.network as keyof typeof analytics.networks].revenue += margin;
        }

      } else if (txn.type === 'cable') {
        analytics.revenue.cableRevenue += amount;
        analytics.volume.cableCount++;

        const actualCost = inlomaxCost !== null ? inlomaxCost : Math.round(amount * 0.995);
        const margin = amount - actualCost;
        analytics.revenue.cableMargin += margin;
        analytics.costs.cableCost += actualCost;

        dayData.purchases += amount;
        dayData.revenue += margin;

        if (isToday) hourlyMap.get(hour).revenue += margin;

      } else if (txn.type === 'electricity') {
        analytics.revenue.electricityRevenue += amount;
        analytics.volume.electricityCount++;

        const actualCost = inlomaxCost !== null ? inlomaxCost : Math.round(amount * 0.995);
        const margin = amount - actualCost;
        analytics.revenue.electricityMargin += margin;
        analytics.costs.electricityCost += actualCost;

        dayData.purchases += amount;
        dayData.revenue += margin;

        if (isToday) hourlyMap.get(hour).revenue += margin;

      } else if (txn.type === 'withdrawal') {
        analytics.volume.withdrawalCount++;
        analytics.volume.totalWithdrawals += amount;
      }
    });

    allTransactions?.forEach((txn) => {
      const amount = Math.abs(txn.amount);
      const status = txn.status || 'unknown';

      if (analytics.statusBreakdown[status]) {
        analytics.statusBreakdown[status].count++;
        analytics.statusBreakdown[status].volume += amount;
        if (status === 'success') {
          analytics.statusBreakdown[status].amount += amount;
        }
      }
    });

    analytics.revenue.totalMargins =
      analytics.revenue.airtimeMargin +
      analytics.revenue.dataMargin +
      analytics.revenue.cableMargin +
      analytics.revenue.electricityMargin;

    analytics.revenue.totalRevenue =
      analytics.revenue.depositFees + analytics.revenue.totalMargins;

    analytics.costs.totalCosts =
      analytics.costs.airtimeCost +
      analytics.costs.dataCost +
      analytics.costs.cableCost +
      analytics.costs.electricityCost +
      analytics.costs.flutterwaveFees;

    analytics.revenue.netProfit = analytics.revenue.totalRevenue - analytics.costs.flutterwaveFees;

    analytics.daily = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    analytics.hourly = Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour);

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    let newUsersQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (dateFilter) {
      const value = dateFilter.split("'")[1];
      newUsersQuery = newUsersQuery.gte('created_at', value);
    }

    const { count: newUsers } = await newUsersQuery;

    return NextResponse.json({
      success: true,
      analytics,
      users: {
        total: totalUsers || 0,
        new: newUsers || 0,
      },
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
