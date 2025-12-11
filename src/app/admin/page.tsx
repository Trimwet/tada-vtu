'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogoInline } from '@/components/logo';
import { toast } from 'sonner';

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
  totalEarnings: number;
  todayEarnings: number;
  // New fields
  flutterwaveFeesPaid: number;
  totalVTUCosts: number;
  grossRevenue: number;
  totalCosts: number;
  netProfit: number;
  todayNetProfit: number;
  flutterwaveBalance: number;
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
      } catch {}
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
    totalMargins: 0, totalEarnings: 0, todayEarnings: 0,
    flutterwaveFeesPaid: 0, totalVTUCosts: 0, grossRevenue: 0, totalCosts: 0,
    netProfit: 0, todayNetProfit: 0, flutterwaveBalance: 0, inlomaxBalance: 0,
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
    txn.type?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4">
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
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Section 1: NET PROFIT - THE REAL MONEY */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                💵 Net Profit
                <span className="text-xs font-normal text-gray-400">(Your actual profit after all costs)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={`border-2 ${stats.netProfit >= 0 ? 'bg-gradient-to-br from-green-600 to-emerald-700 border-green-500' : 'bg-gradient-to-br from-red-600 to-red-700 border-red-500'}`}>
                  <CardContent className="p-6">
                    <p className="text-white/80 text-sm mb-1">Total Net Profit</p>
                    <p className="text-4xl font-bold text-white">
                      {stats.netProfit >= 0 ? '+' : ''}₦{stats.netProfit.toLocaleString()}
                    </p>
                    <p className="text-white/60 text-xs mt-2">After Flutterwave fees & VTU costs</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${stats.todayNetProfit >= 0 ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500' : 'bg-gradient-to-br from-orange-600 to-orange-700 border-orange-500'}`}>
                  <CardContent className="p-6">
                    <p className="text-white/80 text-sm mb-1">Today&apos;s Net Profit</p>
                    <p className="text-4xl font-bold text-white">
                      {stats.todayNetProfit >= 0 ? '+' : ''}₦{stats.todayNetProfit.toLocaleString()}
                    </p>
                    <p className="text-white/60 text-xs mt-2">Profit made today</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Section 2: Revenue vs Costs Breakdown */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                📊 Revenue vs Costs
                <span className="text-xs font-normal text-gray-400">(Detailed breakdown)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Revenue Side */}
                <Card className="bg-green-900/30 border-green-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                      📈 Revenue (Money In)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                      <span className="text-gray-300 text-sm">Service Fees (1%)</span>
                      <span className="text-green-400 font-bold">+₦{stats.serviceFees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                      <span className="text-gray-300 text-sm">Airtime Margin (2.5%)</span>
                      <span className="text-green-400 font-bold">+₦{stats.airtimeMargin.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                      <span className="text-gray-300 text-sm">Data Margin (5%)</span>
                      <span className="text-green-400 font-bold">+₦{stats.dataMargin.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                      <span className="text-gray-300 text-sm">Bills Margin (0.5%)</span>
                      <span className="text-green-400 font-bold">+₦{stats.otherMargin.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-green-500/30 pt-2 flex justify-between items-center">
                      <span className="text-white font-semibold">Total Revenue</span>
                      <span className="text-green-400 font-bold text-lg">+₦{stats.totalEarnings.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Costs Side */}
                <Card className="bg-red-900/30 border-red-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                      📉 Costs (Money Out)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-red-500/10 rounded">
                      <span className="text-gray-300 text-sm">Flutterwave Fees (~1%)</span>
                      <span className="text-red-400 font-bold">-₦{stats.flutterwaveFeesPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-500/10 rounded opacity-50">
                      <span className="text-gray-400 text-sm">VTU Costs (paid from Inlomax)</span>
                      <span className="text-gray-400 text-xs">Separate account</span>
                    </div>
                    <div className="border-t border-red-500/30 pt-2 flex justify-between items-center">
                      <span className="text-white font-semibold">Total Costs</span>
                      <span className="text-red-400 font-bold text-lg">-₦{stats.flutterwaveFeesPaid.toLocaleString()}</span>
                    </div>
                    <div className="bg-gray-800 rounded p-3 mt-2">
                      <p className="text-gray-400 text-xs">💡 VTU costs are paid from your Inlomax wallet, not from customer deposits. Your profit margin is the difference between what customers pay and what Inlomax charges.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Section 3: API Balances */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                🔌 API Wallets
                <span className="text-xs font-normal text-gray-400">(Your payment gateway balances)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={`border-2 ${stats.flutterwaveBalance < 1000 ? 'bg-red-900/30 border-red-500' : 'bg-blue-900/30 border-blue-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm">Flutterwave Balance</p>
                        <p className="text-2xl font-bold text-white">₦{stats.flutterwaveBalance.toLocaleString()}</p>
                        <p className="text-gray-400 text-xs mt-1">Money from customer deposits</p>
                      </div>
                      <div className="text-4xl">💳</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${(inlomaxBalance || stats.inlomaxBalance) < 5000 ? 'bg-red-900/30 border-red-500' : 'bg-purple-900/30 border-purple-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm">Inlomax Balance</p>
                        <p className="text-2xl font-bold text-white">
                          ₦{(inlomaxBalance || stats.inlomaxBalance || 0).toLocaleString()}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">For airtime/data fulfillment</p>
                        {(inlomaxBalance || stats.inlomaxBalance || 0) < 5000 && (
                          <p className="text-red-400 text-xs mt-1">⚠️ Low! Fund your Inlomax</p>
                        )}
                      </div>
                      <div className="text-4xl">📱</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Section 4: Liability */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                ⚠️ Liability
                <span className="text-xs font-normal text-gray-400">(Money you owe to users)</span>
              </h2>
              <Card className="bg-yellow-900/30 border-yellow-500/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">Total User Wallet Balances</p>
                    <p className="text-3xl font-bold text-yellow-400">₦{stats.totalUserBalances.toLocaleString()}</p>
                    <p className="text-gray-400 text-xs mt-1">This is money users have in their wallets that you must be able to fulfill</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">Make sure Flutterwave + Inlomax</p>
                    <p className="text-gray-400 text-xs">balances can cover this</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 3: Platform Stats - USER & TRANSACTION DATA */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                📈 Platform Statistics
                <span className="text-xs font-normal text-gray-400">(User and transaction data)</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <p className="text-gray-400 text-xs mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    <p className="text-gray-500 text-xs">Registered accounts</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <p className="text-gray-400 text-xs mb-1">Active Users</p>
                    <p className="text-2xl font-bold text-green-500">{stats.activeUsers}</p>
                    <p className="text-gray-500 text-xs">Made transactions</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <p className="text-gray-400 text-xs mb-1">Total Deposits</p>
                    <p className="text-2xl font-bold text-blue-500">₦{(stats.totalDeposits/1000).toFixed(0)}k</p>
                    <p className="text-gray-500 text-xs">Money added by users</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <p className="text-gray-400 text-xs mb-1">Total Purchases</p>
                    <p className="text-2xl font-bold text-orange-500">₦{(stats.totalPurchases/1000).toFixed(0)}k</p>
                    <p className="text-gray-500 text-xs">Airtime/Data bought</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <p className="text-gray-400 text-xs mb-1">User Balances</p>
                    <p className="text-2xl font-bold text-yellow-500">₦{(stats.totalUserBalances/1000).toFixed(0)}k</p>
                    <p className="text-gray-500 text-xs">Money in wallets</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <p className="text-gray-400 text-xs mb-1">Pending Txns</p>
                    <p className="text-2xl font-bold text-red-500">{stats.pendingTransactions}</p>
                    <p className="text-gray-500 text-xs">Need attention</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Section 4: Recent Transactions */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                🕐 Recent Transactions
                <span className="text-xs font-normal text-gray-400">(Latest 10 transactions)</span>
              </h2>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {transactions.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No transactions yet</p>
                    ) : transactions.slice(0, 10).map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="text-white font-medium text-sm">{txn.description || txn.type}</p>
                          <p className="text-gray-400 text-xs">{new Date(txn.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${txn.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                            {txn.amount > 0 ? '+' : ''}₦{Math.abs(txn.amount).toLocaleString()}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            txn.status === 'success' ? 'bg-green-500/20 text-green-400' :
                            txn.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>{txn.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
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
                        <th className="text-left p-3 text-gray-300 text-sm">Description</th>
                        <th className="text-left p-3 text-gray-300 text-sm">Type</th>
                        <th className="text-right p-3 text-gray-300 text-sm">Amount</th>
                        <th className="text-center p-3 text-gray-300 text-sm">Status</th>
                        <th className="text-left p-3 text-gray-300 text-sm">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No transactions found</td></tr>
                      ) : filteredTransactions.map((txn) => (
                        <tr key={txn.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                          <td className="p-3">
                            <p className="text-white text-sm">{txn.description || txn.type}</p>
                            <p className="text-gray-500 text-xs">ID: {txn.id.slice(0, 8)}...</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs capitalize ${
                              txn.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                              txn.type === 'airtime' ? 'bg-blue-500/20 text-blue-400' :
                              txn.type === 'data' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-gray-600 text-gray-300'
                            }`}>{txn.type}</span>
                          </td>
                          <td className={`p-3 text-right font-bold ${txn.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                            {txn.amount > 0 ? '+' : ''}₦{Math.abs(txn.amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              txn.status === 'success' ? 'bg-green-500/20 text-green-400' :
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
