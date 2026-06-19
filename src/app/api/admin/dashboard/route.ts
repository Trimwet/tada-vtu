import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/admin-auth';

async function getFlutterwaveBalance(): Promise<{ available: number; ledger: number }> {
  try {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) return { available: 0, ledger: 0 };

    const response = await fetch('https://api.flutterwave.com/v3/balances/NGN', {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const result = await response.json();
    const data = Array.isArray(result.data) ? result.data[0] : result.data;
    return {
      available: data?.available_balance || 0,
      ledger: data?.ledger_balance || 0,
    };
  } catch {
    return { available: 0, ledger: 0 };
  }
}

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

    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { searchParams } = new URL(request.url);
    const usersPage = Math.max(1, parseInt(searchParams.get('usersPage') || '1', 10));
    const usersPageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('usersPageSize') || '20', 10)));
    const transactionsPage = Math.max(1, parseInt(searchParams.get('transactionsPage') || '1', 10));
    const transactionsPageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('transactionsPageSize') || '20', 10)));
    const usersOffset = (usersPage - 1) * usersPageSize;
    const transactionsOffset = (transactionsPage - 1) * transactionsPageSize;

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('balance', 0);

    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    const { count: todayTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { count: pendingTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { data: depositData } = await supabase
      .from('transactions')
      .select('amount, description')
      .eq('type', 'deposit')
      .eq('status', 'success');

    const totalDeposits = depositData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    const serviceFees = depositData?.reduce((sum, t) => {
      const match = t.description?.match(/₦(\d+)\s+service fee paid/);
      return sum + (match ? parseInt(match[1], 10) : 0);
    }, 0) || 0;

    const { data: purchaseDataRaw } = await supabase
      .from('transactions')
      .select('amount, type, response_data')
      .in('type', ['airtime', 'data', 'cable', 'electricity'])
      .eq('status', 'success');

    const purchaseData = purchaseDataRaw || [];
    const totalPurchases = purchaseData.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const airtimePurchases = purchaseData.filter(t => t.type === 'airtime').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const dataPurchases = purchaseData.filter(t => t.type === 'data').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const otherPurchases = purchaseData.filter(t => !['airtime', 'data'].includes(t.type)).reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate actual margins using response_data.data.amount (actual Inlomax cost)
    let actualDataCost = 0;
    let actualAirtimeCost = 0;
    let actualOtherCost = 0;

    purchaseData.forEach(t => {
      const inlomaxCost = t.response_data?.data?.amount ? Number(t.response_data.data.amount) : null;
      if (inlomaxCost !== null) {
        if (t.type === 'airtime') actualAirtimeCost += inlomaxCost;
        else if (t.type === 'data') actualDataCost += inlomaxCost;
        else actualOtherCost += inlomaxCost;
      } else {
        // Fallback estimates for old transactions without response_data
        if (t.type === 'airtime') actualAirtimeCost += Math.abs(t.amount) * 0.975;
        else if (t.type === 'data') actualDataCost += Math.abs(t.amount) - 20; // Flat ₦20 markup
        else actualOtherCost += Math.abs(t.amount) * 0.995;
      }
    });

    const actualVTUCost = actualAirtimeCost + actualDataCost + actualOtherCost;

    // Calculate actual margins (selling price - actual Inlomax cost)
    const airtimeMargin = Math.round(airtimePurchases - actualAirtimeCost);
    const dataMargin = Math.round(dataPurchases - actualDataCost);
    const otherMargin = Math.round(otherPurchases - actualOtherCost);
    const totalMargins = Math.round(totalPurchases - actualVTUCost);
    const estimatedEarnings = serviceFees + totalMargins;

    // Today's metrics (same approach)
    const { data: todayDeposits } = await supabase
      .from('transactions')
      .select('amount, description')
      .eq('type', 'deposit')
      .eq('status', 'success')
      .gte('created_at', today.toISOString());

    const todayServiceFees = todayDeposits?.reduce((sum, t) => {
      const match = t.description?.match(/₦(\d+)\s+service fee paid/);
      return sum + (match ? parseInt(match[1], 10) : 0);
    }, 0) || 0;

    const { data: todayPurchases } = await supabase
      .from('transactions')
      .select('amount, type, response_data')
      .in('type', ['airtime', 'data', 'cable', 'electricity'])
      .eq('status', 'success')
      .gte('created_at', today.toISOString());

    let todayActualCost = 0;
    todayPurchases?.forEach(t => {
      const inlomaxCost = t.response_data?.data?.amount ? Number(t.response_data.data.amount) : null;
      if (inlomaxCost !== null) todayActualCost += inlomaxCost;
      else if (t.type === 'airtime') todayActualCost += Math.abs(t.amount) * 0.975;
      else if (t.type === 'data') todayActualCost += Math.abs(t.amount) - 20;
      else todayActualCost += Math.abs(t.amount) * 0.995;
    });

    const todayPurchaseTotal = todayPurchases?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const todayMargins = Math.round(todayPurchaseTotal - todayActualCost);
    const todayEstimatedEarnings = todayServiceFees + todayMargins;

    const { data: balanceData } = await supabase
      .from('profiles')
      .select('balance');

    const totalUserBalances = balanceData?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;

    const [fwBalances, inlomaxBalance] = await Promise.all([
      getFlutterwaveBalance(),
      getInlomaxBalance(),
    ]);

    const flutterwaveBalance = fwBalances.available;
    const flutterwaveLedgerBalance = fwBalances.ledger;

    const flutterwaveFeesPaid = depositData?.reduce((sum, t) => {
      const amount = Math.abs(t.amount);
      return sum + Math.min(2000, Math.round(amount * 0.014));
    }, 0) || 0;

    const totalVTUCosts = Math.round(actualVTUCost);
    const grossVolume = totalDeposits;
    const grossRevenue = totalDeposits + serviceFees;
    const totalCosts = totalVTUCosts + flutterwaveFeesPaid;
    const netProfit = estimatedEarnings - flutterwaveFeesPaid;

    const todayDepositTotal = todayDeposits?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const todayGrossVolume = todayDepositTotal;
    const todayFlutterwaveFees = todayDeposits?.reduce((sum, t) => {
      const amount = Math.abs(t.amount);
      return sum + Math.min(2000, Math.round(amount * 0.014));
    }, 0) || 0;
    const todayNetProfit = todayEstimatedEarnings - todayFlutterwaveFees;

    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, balance, created_at, is_active')
      .order('created_at', { ascending: false })
      .range(usersOffset, usersOffset + usersPageSize - 1);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, status, description, created_at, reference, external_reference, profiles(full_name)')
      .order('created_at', { ascending: false })
      .range(transactionsOffset, transactionsOffset + transactionsPageSize - 1);

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
        serviceFees,
        airtimeMargin,
        dataMargin,
        otherMargin,
        totalMargins,
        estimatedEarnings,
        todayEstimatedEarnings,
        grossVolume,
        todayGrossVolume,
        flutterwaveFeesPaid,
        totalVTUCosts,
        grossRevenue,
        totalCosts,
        netProfit,
        todayNetProfit,
        flutterwaveBalance,
        flutterwaveLedgerBalance,
        inlomaxBalance,
      },
      users: users || [],
      usersTotal: totalUsers || 0,
      transactions: transactions || [],
      transactionsTotal: totalTransactions || 0,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
