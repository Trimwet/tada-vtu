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

// Get Flutterwave balance
async function getFlutterwaveBalance(): Promise<number> {
  try {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) return 0;

    const response = await fetch('https://api.flutterwave.com/v3/balances/NGN', {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const result = await response.json();
    return result.data?.[0]?.available_balance || 0;
  } catch {
    return 0;
  }
}

// Get Inlomax balance
async function getInlomaxBalance(): Promise<number> {
  try {
    const apiKey = process.env.INLOMAX_API_KEY;
    if (!apiKey) return 0;

    const response = await fetch('https://inlomax.com.ng/api/balance', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const result = await response.json();
    return parseFloat(result.balance) || 0;
  } catch {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars');
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
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (adminError || !admin) {
      console.error('Admin not found:', adminError);
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    // Fetch stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Active users (with balance > 0)
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('balance', 0);

    // Total transactions
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    // Today's transactions
    const { count: todayTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Pending transactions
    const { count: pendingTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Total deposits (wallet funding from customers)
    const { data: depositData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'deposit')
      .eq('status', 'success');

    const totalDeposits = depositData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    // Calculate service fees earned (1% or min ₦20 per deposit)
    // Each deposit has a service fee attached
    const serviceFees = depositData?.reduce((sum, t) => {
      const amount = Math.abs(t.amount);
      const fee = Math.max(20, Math.ceil(amount * 0.01));
      return sum + fee;
    }, 0) || 0;

    // Total airtime/data purchases (what customers spent)
    const { data: purchaseData } = await supabase
      .from('transactions')
      .select('amount, type')
      .in('type', ['airtime', 'data', 'cable', 'electricity'])
      .eq('status', 'success');

    const totalPurchases = purchaseData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    // Estimate margins (roughly 2.5% on airtime, 5% on data)
    const airtimePurchases = purchaseData?.filter(t => t.type === 'airtime').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const dataPurchases = purchaseData?.filter(t => t.type === 'data').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const otherPurchases = purchaseData?.filter(t => !['airtime', 'data'].includes(t.type)).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    const airtimeMargin = Math.round(airtimePurchases * 0.025); // ~2.5% margin
    const dataMargin = Math.round(dataPurchases * 0.05); // ~5% margin
    const otherMargin = Math.round(otherPurchases * 0.005); // ~0.5% margin

    const totalMargins = airtimeMargin + dataMargin + otherMargin;
    const estimatedEarnings = serviceFees + totalMargins; // Renamed for clarity

    // Today's earnings
    const { data: todayDeposits } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'deposit')
      .eq('status', 'success')
      .gte('created_at', today.toISOString());

    const todayServiceFees = todayDeposits?.reduce((sum, t) => {
      const amount = Math.abs(t.amount);
      return sum + Math.max(20, Math.ceil(amount * 0.01));
    }, 0) || 0;

    const { data: todayPurchases } = await supabase
      .from('transactions')
      .select('amount, type')
      .in('type', ['airtime', 'data', 'cable', 'electricity'])
      .eq('status', 'success')
      .gte('created_at', today.toISOString());

    const todayAirtime = todayPurchases?.filter(t => t.type === 'airtime').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const todayData = todayPurchases?.filter(t => t.type === 'data').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const todayMargins = Math.round(todayAirtime * 0.025) + Math.round(todayData * 0.05);
    const todayEstimatedEarnings = todayServiceFees + todayMargins;

    // Total user balances (your liability)
    const { data: balanceData } = await supabase
      .from('profiles')
      .select('balance');

    const totalUserBalances = balanceData?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;

    // Get API balances
    const [flutterwaveBalance, inlomaxBalance] = await Promise.all([
      getFlutterwaveBalance(),
      getInlomaxBalance(),
    ]);

    // Calculate Flutterwave fees paid (estimate ~1% of deposits)
    const flutterwaveFeesPaid = Math.round(totalDeposits * 0.01);

    // Calculate actual costs
    const airtimeCost = Math.round(airtimePurchases * 0.975);
    const dataCost = Math.round(dataPurchases * 0.95);
    const otherCost = Math.round(otherPurchases * 0.995);
    const totalVTUCosts = airtimeCost + dataCost + otherCost;

    // Actual volume and profit calculation
    const grossVolume = totalDeposits + totalPurchases; // Total money flowing through platform
    const grossRevenue = totalDeposits + serviceFees; // Platform inflow
    const totalCosts = totalVTUCosts + flutterwaveFeesPaid;
    const netProfit = estimatedEarnings - flutterwaveFeesPaid;

    // Today's metrics
    const todayGrossVolume = (todayDeposits?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0) + (todayPurchases?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0);
    const todayFlutterwaveFees = Math.round((todayDeposits?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0) * 0.01);
    const todayNetProfit = todayEstimatedEarnings - todayFlutterwaveFees;

    // Fetch users (last 100)
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, balance, created_at, is_active')
      .order('created_at', { ascending: false })
      .limit(100);

    // Fetch transactions (last 100) - with user full name
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, status, description, created_at, reference, external_reference, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalTransactions: totalTransactions || 0,
        todayTransactions: todayTransactions || 0,
        pendingTransactions: pendingTransactions || 0,
        totalDeposits,
        totalPurchases,
        totalUserBalances,
        // Earnings breakdown
        serviceFees,
        airtimeMargin,
        dataMargin,
        otherMargin,
        totalMargins,
        estimatedEarnings, // Renamed
        todayEstimatedEarnings, // Renamed
        grossVolume, // NEW
        todayGrossVolume, // NEW
        // NEW: Costs & Net Profit
        flutterwaveFeesPaid,
        totalVTUCosts,
        grossRevenue,
        totalCosts,
        netProfit,
        todayNetProfit,
        // API Balances
        flutterwaveBalance,
        inlomaxBalance,
      },
      users: users || [],
      transactions: transactions || [],
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
