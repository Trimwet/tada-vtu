import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Verify admin token
function verifyToken(token: string): { valid: boolean; adminId?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return { valid: false };
    }
    return { valid: true, adminId: payload.id };
  } catch {
    return { valid: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { valid, adminId } = verifyToken(token);

    if (!valid || !adminId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin exists
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // day, week, month, year, all, custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
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

    // Fetch all transactions for the period
    let query = supabase
      .from('transactions')
      .select('type, amount, status, created_at, network')
      .eq('status', 'success');

    if (dateFilter) {
      const [field, operator, value] = dateFilter.split(' ');
      if (operator === '>=') {
        query = query.gte('created_at', value.replace(/'/g, ''));
      }
    }

    const { data: transactions, error: txnError } = await query;

    if (txnError) {
      console.error('Transaction fetch error:', txnError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Initialize analytics object
    const analytics = {
      period,
      startDate: startDate || (dateFilter ? dateFilter.split("'")[1] : null),
      endDate: endDate || now.toISOString(),
      
      // Revenue breakdown
      revenue: {
        totalDeposits: 0,
        depositFees: 0, // 1% or min ₦20 per deposit
        airtimeRevenue: 0,
        airtimeMargin: 0, // 2.5% margin
        dataRevenue: 0,
        dataMargin: 0, // 5% margin
        cableRevenue: 0,
        cableMargin: 0, // 0.5% margin
        electricityRevenue: 0,
        electricityMargin: 0, // 0.5% margin
        totalMargins: 0,
        totalRevenue: 0,
        netProfit: 0, // After Flutterwave fees (~1%)
      },

      // Costs
      costs: {
        airtimeCost: 0, // 97.5% of airtime sales
        dataCost: 0, // 95% of data sales
        cableCost: 0, // 99.5% of cable sales
        electricityCost: 0, // 99.5% of electricity sales
        flutterwaveFees: 0, // ~1% of deposits
        totalCosts: 0,
      },

      // Volume metrics
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

      // Network breakdown
      networks: {
        MTN: { count: 0, volume: 0, revenue: 0 },
        AIRTEL: { count: 0, volume: 0, revenue: 0 },
        GLO: { count: 0, volume: 0, revenue: 0 },
        '9MOBILE': { count: 0, volume: 0, revenue: 0 },
      },

      // Daily breakdown for charts
      daily: [] as Array<{
        date: string;
        deposits: number;
        purchases: number;
        revenue: number;
        transactions: number;
      }>,

      // Hourly breakdown (for current day)
      hourly: [] as Array<{
        hour: number;
        transactions: number;
        revenue: number;
      }>,
    };

    // Process transactions
    const dailyMap = new Map<string, any>();
    const hourlyMap = new Map<number, any>();

    transactions?.forEach((txn) => {
      const amount = Math.abs(txn.amount);
      const date = new Date(txn.created_at);
      const dateKey = date.toISOString().split('T')[0];
      const hour = date.getHours();

      analytics.volume.totalTransactions++;

      // Daily aggregation
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

      // Hourly aggregation (only for today)
      const isToday = dateKey === now.toISOString().split('T')[0];
      if (isToday) {
        if (!hourlyMap.has(hour)) {
          hourlyMap.set(hour, { hour, transactions: 0, revenue: 0 });
        }
        const hourData = hourlyMap.get(hour);
        hourData.transactions++;
      }

      // Process by type
      if (txn.type === 'deposit') {
        analytics.revenue.totalDeposits += amount;
        analytics.volume.depositCount++;
        
        // Calculate deposit fee (1% or min ₦20)
        const fee = Math.max(20, Math.ceil(amount * 0.01));
        analytics.revenue.depositFees += fee;
        
        dayData.deposits += amount;
        dayData.revenue += fee;
        
        if (isToday) hourlyMap.get(hour).revenue += fee;

        // Flutterwave fee (~1% of deposit)
        analytics.costs.flutterwaveFees += Math.ceil(amount * 0.01);
        
      } else if (txn.type === 'airtime') {
        analytics.revenue.airtimeRevenue += amount;
        analytics.volume.airtimeCount++;
        
        // 2.5% margin
        const margin = Math.round(amount * 0.025);
        analytics.revenue.airtimeMargin += margin;
        analytics.costs.airtimeCost += Math.round(amount * 0.975);
        
        dayData.purchases += amount;
        dayData.revenue += margin;
        
        if (isToday) hourlyMap.get(hour).revenue += margin;

        // Network tracking
        if (txn.network && analytics.networks[txn.network as keyof typeof analytics.networks]) {
          analytics.networks[txn.network as keyof typeof analytics.networks].count++;
          analytics.networks[txn.network as keyof typeof analytics.networks].volume += amount;
          analytics.networks[txn.network as keyof typeof analytics.networks].revenue += margin;
        }
        
      } else if (txn.type === 'data') {
        analytics.revenue.dataRevenue += amount;
        analytics.volume.dataCount++;
        
        // 5% margin
        const margin = Math.round(amount * 0.05);
        analytics.revenue.dataMargin += margin;
        analytics.costs.dataCost += Math.round(amount * 0.95);
        
        dayData.purchases += amount;
        dayData.revenue += margin;
        
        if (isToday) hourlyMap.get(hour).revenue += margin;

        // Network tracking
        if (txn.network && analytics.networks[txn.network as keyof typeof analytics.networks]) {
          analytics.networks[txn.network as keyof typeof analytics.networks].count++;
          analytics.networks[txn.network as keyof typeof analytics.networks].volume += amount;
          analytics.networks[txn.network as keyof typeof analytics.networks].revenue += margin;
        }
        
      } else if (txn.type === 'cable') {
        analytics.revenue.cableRevenue += amount;
        analytics.volume.cableCount++;
        
        // 0.5% margin
        const margin = Math.round(amount * 0.005);
        analytics.revenue.cableMargin += margin;
        analytics.costs.cableCost += Math.round(amount * 0.995);
        
        dayData.purchases += amount;
        dayData.revenue += margin;
        
        if (isToday) hourlyMap.get(hour).revenue += margin;
        
      } else if (txn.type === 'electricity') {
        analytics.revenue.electricityRevenue += amount;
        analytics.volume.electricityCount++;
        
        // 0.5% margin
        const margin = Math.round(amount * 0.005);
        analytics.revenue.electricityMargin += margin;
        analytics.costs.electricityCost += Math.round(amount * 0.995);
        
        dayData.purchases += amount;
        dayData.revenue += margin;
        
        if (isToday) hourlyMap.get(hour).revenue += margin;
        
      } else if (txn.type === 'withdrawal') {
        analytics.volume.withdrawalCount++;
        analytics.volume.totalWithdrawals += amount;
      }
    });

    // Calculate totals
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

    // Convert maps to arrays
    analytics.daily = Array.from(dailyMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );
    
    analytics.hourly = Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour);

    // Get user growth data
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
