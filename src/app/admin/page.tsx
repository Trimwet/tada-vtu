'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  profiles?: { full_name: string; email: string };
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
  const [userModal, setUserModal] = useState<UserModalState>({
    isOpen: false,
    user: null,
    action: null,
    amount: '',
    reason: '',
    loading: false,
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: actionType,
          userId: userModal.user.id,
          amount: userModal.amount,
          reason: userModal.reason,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message);
        // Refresh data
        fetchData(token);
        closeUserModal();
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setUserModal(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    // Check admin auth
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');
    
    if (!token || !adminData) {
      router.push('/admin/login');
      return;
    }

    setAdmin(JSON.parse(adminData));
    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
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

      setStats(data.stats || {
        totalUsers: 0,
        totalTransactions: 0,
        todayTransactions: 0,
        activeUsers: 0,
        pendingTransactions: 0,
        totalDeposits: 0,
        totalPurchases: 0,
        totalUserBalances: 0,
        serviceFees: 0,
        airtimeMargin: 0,
        dataMargin: 0,
        otherMargin: 0,
        totalMargins: 0,
        totalEarnings: 0,
        todayEarnings: 0,
      });
      setUsers(data.users || []);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
      // Set default empty data so UI still renders
      setStats({
        totalUsers: 0,
        totalTransactions: 0,
        todayTransactions: 0,
        activeUsers: 0,
        pendingTransactions: 0,
        totalDeposits: 0,
        totalPurchases: 0,
        totalUserBalances: 0,
        serviceFees: 0,
        airtimeMargin: 0,
        dataMargin: 0,
        otherMargin: 0,
        totalMargins: 0,
        totalEarnings: 0,
        todayEarnings: 0,
      });
    } finally {
      setLoading(false);
    }
  };

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
              <span className="text-white font-semibold">Admin Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">
                {admin?.full_name} ({admin?.role})
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'users', 'transactions'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'bg-green-600 hover:bg-green-700' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Earnings Card - Most Important */}
            <Card className="bg-gradient-to-br from-green-600 to-emerald-700 border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg">💰 Your Earnings</CardTitle>
                <CardDescription className="text-green-100">Money you've made from the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-green-100 text-sm">Total Earnings</p>
                    <p className="text-3xl font-bold text-white">₦{stats.totalEarnings.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-green-100 text-sm">Today's Earnings</p>
                    <p className="text-3xl font-bold text-white">₦{stats.todayEarnings.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-green-100 text-sm">Service Fees</p>
                    <p className="text-2xl font-bold text-white">₦{stats.serviceFees.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-green-100 text-sm">VTU Margins</p>
                    <p className="text-2xl font-bold text-white">₦{stats.totalMargins.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-green-100 text-sm mb-2">Margin Breakdown:</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-white">Airtime: ₦{stats.airtimeMargin.toLocaleString()}</span>
                    <span className="text-white">Data: ₦{stats.dataMargin.toLocaleString()}</span>
                    <span className="text-white">Bills: ₦{stats.otherMargin.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <p className="text-gray-400 text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-green-500">{stats.activeUsers}</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <p className="text-gray-400 text-sm">Total Deposits</p>
                  <p className="text-2xl font-bold text-blue-500">₦{stats.totalDeposits.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <p className="text-gray-400 text-sm">Total Purchases</p>
                  <p className="text-2xl font-bold text-white">₦{stats.totalPurchases.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <p className="text-gray-400 text-sm">User Balances</p>
                  <p className="text-2xl font-bold text-yellow-500">₦{stats.totalUserBalances.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <p className="text-gray-400 text-sm">Pending Txns</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.pendingTransactions}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No transactions yet</p>
                  ) : transactions.slice(0, 10).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{txn.description || txn.type}</p>
                        <p className="text-gray-400 text-sm">ID: {txn.id.slice(0, 8)}...</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${txn.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                          ₦{Math.abs(txn.amount).toLocaleString()}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          txn.status === 'success' ? 'bg-green-500/20 text-green-400' :
                          txn.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {txn.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md bg-gray-800 border-gray-700 text-white"
            />
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="text-left p-4 text-gray-300">Name</th>
                        <th className="text-left p-4 text-gray-300">Email</th>
                        <th className="text-left p-4 text-gray-300">Phone</th>
                        <th className="text-right p-4 text-gray-300">Balance</th>
                        <th className="text-center p-4 text-gray-300">Status</th>
                        <th className="text-left p-4 text-gray-300">Joined</th>
                        <th className="text-center p-4 text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400">No users found</td>
                        </tr>
                      ) : filteredUsers.map((user) => (
                        <tr key={user.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                          <td className="p-4 text-white">{user.full_name || '-'}</td>
                          <td className="p-4 text-gray-300">{user.email}</td>
                          <td className="p-4 text-gray-300">{user.phone_number || '-'}</td>
                          <td className="p-4 text-right text-green-500 font-medium">₦{(user.balance || 0).toLocaleString()}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${user.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {user.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-4 text-gray-400 text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openUserModal(user, 'fund')} className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-8 px-2">
                                Fund
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openUserModal(user, 'debit')} className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 h-8 px-2">
                                Debit
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openUserModal(user, 'view')} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-2">
                                More
                              </Button>
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

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md bg-gray-800 border-gray-700 text-white"
            />
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="text-left p-4 text-gray-300">Description</th>
                        <th className="text-left p-4 text-gray-300">User</th>
                        <th className="text-left p-4 text-gray-300">Type</th>
                        <th className="text-right p-4 text-gray-300">Amount</th>
                        <th className="text-center p-4 text-gray-300">Status</th>
                        <th className="text-left p-4 text-gray-300">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">No transactions found</td>
                        </tr>
                      ) : filteredTransactions.map((txn) => (
                        <tr key={txn.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                          <td className="p-4 text-white">{txn.description || txn.type}</td>
                          <td className="p-4 text-gray-300">{txn.user_id?.slice(0, 8) || '-'}...</td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-200 capitalize">
                              {txn.type}
                            </span>
                          </td>
                          <td className={`p-4 text-right font-medium ${txn.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                            {txn.amount > 0 ? '+' : ''}₦{Math.abs(txn.amount).toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              txn.status === 'success' ? 'bg-green-500/20 text-green-400' :
                              txn.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                          <td className="p-4 text-gray-400 text-sm">
                            {new Date(txn.created_at).toLocaleString()}
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
      </main>

      {/* User Action Modal */}
      {userModal.isOpen && userModal.user && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {userModal.action === 'fund' && 'Fund User Wallet'}
                  {userModal.action === 'debit' && 'Debit User Wallet'}
                  {userModal.action === 'view' && 'User Details'}
                </h3>
                <button onClick={closeUserModal} className="text-gray-400 hover:text-white">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name</span>
                  <span className="text-white font-medium">{userModal.user.full_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email</span>
                  <span className="text-white">{userModal.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone</span>
                  <span className="text-white">{userModal.user.phone_number || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance</span>
                  <span className="text-green-500 font-bold">₦{(userModal.user.balance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={userModal.user.is_active !== false ? 'text-green-400' : 'text-red-400'}>
                    {userModal.user.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Fund/Debit Form */}
              {(userModal.action === 'fund' || userModal.action === 'debit') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Amount (₦)</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={userModal.amount}
                      onChange={(e) => setUserModal(prev => ({ ...prev, amount: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Reason (optional)</label>
                    <Input
                      type="text"
                      placeholder="e.g., Bonus, Refund, Correction"
                      value={userModal.reason}
                      onChange={(e) => setUserModal(prev => ({ ...prev, reason: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <Button
                    onClick={() => handleUserAction(userModal.action === 'fund' ? 'fund_wallet' : 'debit_wallet')}
                    disabled={!userModal.amount || userModal.loading}
                    className={`w-full ${userModal.action === 'fund' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                  >
                    {userModal.loading ? 'Processing...' : userModal.action === 'fund' ? 'Fund Wallet' : 'Debit Wallet'}
                  </Button>
                </div>
              )}

              {/* View Actions */}
              {userModal.action === 'view' && (
                <div className="space-y-3">
                  <Button
                    onClick={() => setUserModal(prev => ({ ...prev, action: 'fund' }))}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Fund Wallet
                  </Button>
                  <Button
                    onClick={() => setUserModal(prev => ({ ...prev, action: 'debit' }))}
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                  >
                    Debit Wallet
                  </Button>
                  <Button
                    onClick={() => handleUserAction('toggle_status')}
                    disabled={userModal.loading}
                    className={`w-full ${userModal.user.is_active !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {userModal.loading ? 'Processing...' : userModal.user.is_active !== false ? 'Deactivate User' : 'Activate User'}
                  </Button>
                  <Button
                    onClick={() => handleUserAction('reset_pin')}
                    disabled={userModal.loading}
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Reset Transaction PIN
                  </Button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <Button onClick={closeUserModal} variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
