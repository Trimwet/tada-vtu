'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogoInline } from '@/components/logo';
import { toast } from 'sonner';
import { StatCard } from '@/components/admin/StatCard';
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts';
import { Wallet, Users, TrendUp, CreditCard, CurrencyNgn, ChartLineUp, Storefront } from '@phosphor-icons/react';

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  todayTransactions: number;
  activeUsers: number;
  pendingTransactions: number;
  totalDeposits: number;
  totalPurchases: number;
  totalUserBalances: number;
  serviceFees: number;
  airtimeMargin: number;
  dataMargin: number;
  otherMargin: number;
  totalMargins: number;
  estimatedEarnings: number;
  todayEstimatedEarnings: number;
  grossVolume: number;
  todayGrossVolume: number;
  // New fields
  flutterwaveFeesPaid: number;
  totalVTUCosts: number;
  grossRevenue: number;
  totalCosts: number;
  netProfit: number;
  todayNetProfit: number;
  flutterwaveBalance: number;
  flutterwaveLedgerBalance: number;
  inlomaxBalance: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  balance: number;
  created_at: string;
  is_active: boolean;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  reference?: string;
  external_reference?: string;
  profiles?: {
    full_name: string;
  };
}

interface UserModalState {
  isOpen: boolean;
  user: User | null;
  action: 'view' | 'fund' | 'debit' | null;
  amount: string;
  reason: string;
  loading: boolean;
}


export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<{ full_name: string; role: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [inlomaxBalance, setInlomaxBalance] = useState<number | null>(null);
  const [userModal, setUserModal] = useState<UserModalState>({
    isOpen: false, user: null, action: null, amount: '', reason: '', loading: false,
  });

  const openUserModal = (user: User, action: 'view' | 'fund' | 'debit') => {
    setUserModal({ isOpen: true, user, action, amount: '', reason: '', loading: false });
  };

  const closeUserModal = () => {
    setUserModal({ isOpen: false, user: null, action: null, amount: '', reason: '', loading: false });
  };

  const handleUserAction = async (actionType: string) => {
    if (!userModal.user) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    setUserModal(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: actionType, userId: userModal.user.id,
          amount: userModal.amount, reason: userModal.reason,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(result.message);
        fetchData(token);
        closeUserModal();
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setUserModal(prev => ({ ...prev, loading: false }));
    }
  };


  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');
    if (!token || !adminData) { router.push('/admin/login'); return; }
    setAdmin(JSON.parse(adminData));
    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          router.push('/admin/login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch data');
      }
      setStats(data.stats || getDefaultStats());
      setUsers(data.users || []);
      setTransactions(data.transactions || []);

      try {
        const balanceRes = await fetch('/api/inlomax/balance');
        const balanceData = await balanceRes.json();
        if (balanceData.status === 'success') setInlomaxBalance(balanceData.balance);
      } catch { }

      try {
        const analyticsRes = await fetch('/api/admin/analytics?range=30d', { headers: { Authorization: `Bearer ${token}` } });
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      } catch (e) { console.error("Analytics fetch error", e); }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
      setStats(getDefaultStats());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultStats = (): Stats => ({
    totalUsers: 0, totalTransactions: 0, todayTransactions: 0, activeUsers: 0,
    pendingTransactions: 0, totalDeposits: 0, totalPurchases: 0, totalUserBalances: 0,
    serviceFees: 0, airtimeMargin: 0, dataMargin: 0, otherMargin: 0,
    totalMargins: 0, estimatedEarnings: 0, todayEstimatedEarnings: 0,
    grossVolume: 0, todayGrossVolume: 0,
    flutterwaveFeesPaid: 0, totalVTUCosts: 0, grossRevenue: 0, totalCosts: 0,
    netProfit: 0, todayNetProfit: 0, flutterwaveBalance: 0, flutterwaveLedgerBalance: 0, inlomaxBalance: 0,
  });

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone_number?.includes(searchQuery)
  );

  const filteredTransactions = transactions.filter(txn =>
    txn.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    txn.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    txn.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    txn.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    txn.external_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    txn.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <LogoInline size="sm" />
              <span className="text-gray-400">|</span>
              <span className="text-white font-semibold">Admin Panel</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">{admin?.full_name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4 flex-wrap">
          {(['overview', 'users', 'transactions'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'ghost'}
              onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
              className={activeTab === tab ? 'bg-green-600 hover:bg-green-700' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
            >
              {tab === 'overview' && '📊 '}
              {tab === 'users' && '👥 '}
              {tab === 'transactions' && '💳 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/analytics-detailed')}
            className="text-gray-400 hover:text-white hover:bg-gray-800 ml-auto"
          >
            📈 Detailed Analytics
          </Button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Hero Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Gross Volume"
                value={`₦${stats.grossVolume.toLocaleString()}`}
                icon={<CurrencyNgn weight="bold" className="w-5 h-5" />}
                trend={{
                  value: analytics?.summary?.trends?.grossVolume || 0,
                  direction: (analytics?.summary?.trends?.grossVolume || 0) >= 0 ? 'up' : 'down',
                  label: 'vs last period'
                }}
                tooltip="Total money flowing through the platform including all deposits from users and VTU purchases made."
                description="Total flow (Deposits + VTU)"
              />
              <StatCard
                title="Estimated Earnings"
                value={`₦${stats.estimatedEarnings.toLocaleString()}`}
                icon={<TrendUp weight="bold" className="w-5 h-5" />}
                trend={{
                  value: analytics?.summary?.trends?.estimatedEarnings || 0,
                  direction: (analytics?.summary?.trends?.estimatedEarnings || 0) >= 0 ? 'up' : 'down',
                  label: 'vs last period'
                }}
                tooltip="Your estimated profit from service margins (2.5% airtime, 5% data) plus service fees charged on deposits."
                description="Margins + Fees (Est.)"
              />
              <StatCard
                title="Net Profit"
                value={`₦${stats.netProfit.toLocaleString()}`}
                icon={<ChartLineUp weight="bold" className="w-5 h-5" />}
                tooltip="Your actual profit after deducting Flutterwave gateway fees (~1%) from estimated earnings."
                description="Earnings minus Gateway fees"
              />
              <StatCard
                title="Active Users"
                value={stats.activeUsers.toString()}
                icon={<Users weight="bold" className="w-5 h-5" />}
                trend={{
                  value: analytics?.summary?.trends?.users || 0,
                  direction: (analytics?.summary?.trends?.users || 0) >= 0 ? 'up' : 'down',
                  label: 'vs last period'
                }}
                tooltip="Users with wallet balance greater than ₦0. These are users who have funded their wallets."
              />
              <StatCard
                title="Total Transactions"
                value={stats.totalTransactions.toLocaleString()}
                icon={<CreditCard weight="bold" className="w-5 h-5" />}
                trend={{
                  value: analytics?.summary?.trends?.transactions || 0,
                  direction: (analytics?.summary?.trends?.transactions || 0) >= 0 ? 'up' : 'down',
                  label: 'vs last period'
                }}
                tooltip="Total number of all transactions including deposits, airtime, data, cable TV, and electricity purchases."
              />
            </div>

            {/* 2. Main Analytics Charts */}
            <div className="py-2">
              <AnalyticsCharts
                data={analytics?.chartData || []}
                serviceBreakdown={analytics?.serviceBreakdown}
                loading={!analytics}
                trends={analytics?.summary?.trends}
              />
            </div>

            {/* 3. Detailed Financials (Collapsible or just Grid, let's keep them prominent) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-400" /> API Wallet Balances
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs">Flutterwave (Available)</p>
                      <p className="text-xl font-bold text-white">₦{Number(stats.flutterwaveBalance || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
                      {(stats.flutterwaveBalance || 0) < 5000 && <p className="text-red-500 text-[10px] mt-1">⚠️ Low Balance</p>}
                    </div>
                    <div className="flex-1 text-right pr-4 border-r border-gray-700 mx-4">
                      <p className="text-gray-400 text-[10px]">Unsettled Balance</p>
                      <p className="text-sm font-medium text-orange-400">
                        ₦{Number((stats.flutterwaveLedgerBalance || 0) - (stats.flutterwaveBalance || 0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                      <span className="text-orange-500 font-bold">F</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
                    <div>
                      <p className="text-gray-400 text-xs">Inlomax (VTU Provider)</p>
                      <p className="text-xl font-bold text-white">₦{Number(inlomaxBalance || stats.inlomaxBalance || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
                      {(inlomaxBalance || stats.inlomaxBalance || 0) < 5000 && <p className="text-red-500 text-[10px] mt-1">⚠️ Low Balance</p>}
                    </div>
                    <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-500 font-bold">I</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Storefront className="w-4 h-4 text-green-400" /> Revenue Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Airtime Margin</span>
                    <span className="text-green-400">+₦{stats.airtimeMargin.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Data Margin</span>
                    <span className="text-green-400">+₦{stats.dataMargin.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Service Fees</span>
                    <span className="text-green-400">+₦{stats.serviceFees.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-700 my-2 pt-2 flex justify-between font-medium">
                    <span className="text-white">Estimated Earnings</span>
                    <span className="text-green-400">₦{stats.estimatedEarnings.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 4. Recent Transactions */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="py-2 text-left">User</th>
                        <th className="py-2 text-left">Description</th>
                        <th className="py-2 text-left">Date</th>
                        <th className="py-2 text-right">Amount</th>
                        <th className="py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {transactions.slice(0, 10).map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-700/30">
                          <td className="py-3 px-1">
                            <p className="text-white font-medium text-xs truncate max-w-[120px]">{txn.profiles?.full_name || 'System'}</p>
                            <p className="text-[9px] text-gray-500 font-mono truncate max-w-[120px]">{txn.reference || txn.id}</p>
                          </td>
                          <td className="py-3 px-1 text-white text-xs">
                            {txn.description || txn.type}
                            {txn.external_reference && <p className="text-[9px] text-gray-500 font-mono">{txn.external_reference}</p>}
                          </td>
                          <td className="py-3 px-1 text-gray-500 text-[10px]">{new Date(txn.created_at).toLocaleString()}</td>
                          <td className={`py-3 px-1 text-right font-medium text-xs ${txn.amount > 0 ? 'text-green-400' : 'text-gray-300'}`}>
                            {txn.amount > 0 ? '+' : ''}₦{Math.abs(txn.amount).toLocaleString()}
                          </td>
                          <td className="py-3 px-1 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${txn.status === 'success' ? 'bg-green-500/10 text-green-400' :
                              txn.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">👥 All Users ({users.length})</h2>
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="text-left p-3 text-gray-300 text-sm">User</th>
                        <th className="text-left p-3 text-gray-300 text-sm">Contact</th>
                        <th className="text-right p-3 text-gray-300 text-sm">Balance</th>
                        <th className="text-center p-3 text-gray-300 text-sm">Status</th>
                        <th className="text-center p-3 text-gray-300 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No users found</td></tr>
                      ) : filteredUsers.map((user) => (
                        <tr key={user.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                          <td className="p-3">
                            <p className="text-white font-medium">{user.full_name || 'No name'}</p>
                            <p className="text-gray-400 text-xs">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-gray-300 text-sm">{user.email}</p>
                            <p className="text-gray-400 text-xs">{user.phone_number || 'No phone'}</p>
                          </td>
                          <td className="p-3 text-right">
                            <p className="text-green-500 font-bold">₦{(user.balance || 0).toLocaleString()}</p>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${user.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {user.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openUserModal(user, 'fund')} className="text-green-400 hover:bg-green-500/10 h-7 px-2 text-xs">Fund</Button>
                              <Button size="sm" variant="ghost" onClick={() => openUserModal(user, 'debit')} className="text-yellow-400 hover:bg-yellow-500/10 h-7 px-2 text-xs">Debit</Button>
                              <Button size="sm" variant="ghost" onClick={() => openUserModal(user, 'view')} className="text-blue-400 hover:bg-blue-500/10 h-7 px-2 text-xs">More</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">💳 All Transactions ({transactions.length})</h2>
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="text-left p-3 text-gray-300 text-sm">User</th>
                        <th className="text-left p-3 text-gray-300 text-sm">Description</th>
                        <th className="text-left p-3 text-gray-300 text-sm">Type</th>
                        <th className="text-right p-3 text-gray-300 text-sm">Amount</th>
                        <th className="text-center p-3 text-gray-300 text-sm">Status</th>
                        <th className="text-left p-3 text-gray-300 text-sm">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">No transactions found</td></tr>
                      ) : filteredTransactions.map((txn) => (
                        <tr key={txn.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                          <td className="p-3">
                            <p className="text-white font-medium">{txn.profiles?.full_name || 'System'}</p>
                            <p className="text-gray-500 text-[10px] font-mono">{txn.user_id.slice(0, 8)}...</p>
                          </td>
                          <td className="p-3">
                            <p className="text-white text-sm">{txn.description || txn.type}</p>
                            <div className="flex flex-col gap-0.5 mt-1">
                              {txn.reference && <p className="text-gray-500 text-[9px] font-mono">Ref: {txn.reference}</p>}
                              {txn.external_reference && <p className="text-gray-500 text-[9px] font-mono">Ext: {txn.external_reference}</p>}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs capitalize ${txn.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                              txn.type === 'airtime' ? 'bg-blue-500/20 text-blue-400' :
                                txn.type === 'data' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-gray-600 text-gray-300'
                              }`}>{txn.type}</span>
                          </td>
                          <td className={`p-3 text-right font-bold ${txn.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                            {txn.amount > 0 ? '+' : ''}₦{Math.abs(txn.amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${txn.status === 'success' ? 'bg-green-500/20 text-green-400' :
                              txn.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>{txn.status}</span>
                          </td>
                          <td className="p-3 text-gray-400 text-sm">{new Date(txn.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* User Action Modal */}
      {userModal.isOpen && userModal.user && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {userModal.action === 'fund' && '💰 Fund User Wallet'}
                {userModal.action === 'debit' && '💸 Debit User Wallet'}
                {userModal.action === 'view' && '👤 User Details'}
              </h3>
              <button onClick={closeUserModal} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-4 space-y-4">
              {/* User Info Card */}
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span className="text-gray-400">Name</span><span className="text-white font-medium">{userModal.user.full_name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="text-white text-sm">{userModal.user.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="text-white">{userModal.user.phone_number || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Balance</span><span className="text-green-500 font-bold">₦{(userModal.user.balance || 0).toLocaleString()}</span></div>
              </div>

              {/* Fund/Debit Form */}
              {(userModal.action === 'fund' || userModal.action === 'debit') && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Amount (₦)</label>
                    <Input type="number" placeholder="Enter amount" value={userModal.amount} onChange={(e) => setUserModal(prev => ({ ...prev, amount: e.target.value }))} className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
                    <Input type="text" placeholder="e.g., Bonus, Refund" value={userModal.reason} onChange={(e) => setUserModal(prev => ({ ...prev, reason: e.target.value }))} className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <Button onClick={() => handleUserAction(userModal.action === 'fund' ? 'fund_wallet' : 'debit_wallet')} disabled={!userModal.amount || userModal.loading} className={`w-full ${userModal.action === 'fund' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
                    {userModal.loading ? 'Processing...' : userModal.action === 'fund' ? 'Fund Wallet' : 'Debit Wallet'}
                  </Button>
                </div>
              )}

              {/* View Actions */}
              {userModal.action === 'view' && (
                <div className="space-y-2">
                  <Button onClick={() => setUserModal(prev => ({ ...prev, action: 'fund' }))} className="w-full bg-green-600 hover:bg-green-700">💰 Fund Wallet</Button>
                  <Button onClick={() => setUserModal(prev => ({ ...prev, action: 'debit' }))} className="w-full bg-yellow-600 hover:bg-yellow-700">💸 Debit Wallet</Button>
                  <Button onClick={() => handleUserAction('toggle_status')} disabled={userModal.loading} className={`w-full ${userModal.user.is_active !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {userModal.user.is_active !== false ? '🚫 Deactivate User' : '✅ Activate User'}
                  </Button>
                  <Button onClick={() => handleUserAction('reset_pin')} disabled={userModal.loading} variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                    🔑 Reset Transaction PIN
                  </Button>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-700">
              <Button onClick={closeUserModal} variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
