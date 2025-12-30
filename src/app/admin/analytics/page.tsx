'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';

// Dynamic import for Recharts components to reduce initial bundle size
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

type DateRange = 'today' | '7d' | '30d' | '90d' | 'custom';

interface ChartDataPoint {
  date: string;
  revenue: number;
  deposits: number;
  airtime: number;
  data: number;
  bills: number;
  transactions: number;
  users: number;
}

interface HourlyDataPoint {
  hour: number;
  transactions: number;
}

interface ServiceData {
  count: number;
  volume: number;
  revenue: number;
}

interface AnalyticsData {
  range: string;
  startDate: string;
  endDate: string;
  chartData: ChartDataPoint[];
  hourlyData: HourlyDataPoint[];
  serviceBreakdown: Record<string, ServiceData>;
  summary: {
    totalRevenue: number;
    totalDeposits: number;
    totalTransactions: number;
    newUsers: number;
    avgDailyRevenue: number;
    avgDailyTransactions: number;
    peakHour: number;
    topService: { name: string; count: number; volume: number; revenue: number };
  };
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState<DateRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchAnalytics(token);
  }, [router, range, customStart, customEnd]);


  const fetchAnalytics = async (token: string) => {
    setLoading(true);
    try {
      let url = `/api/admin/analytics?range=${range}`;
      if (range === 'custom' && customStart && customEnd) {
        url += `&start=${customStart}&end=${customEnd}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch');
      }

      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;
  const formatDate = (dateStr: string) => {
    try {
      // Handle PostgreSQL timestamp format properly
      let isoString = dateStr;
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        isoString = dateStr.replace(' ', 'T');
      }
      if (!isoString.includes('+') && !isoString.includes('Z')) {
        isoString += 'Z';
      }
      
      const d = new Date(isoString);
      if (isNaN(d.getTime())) {
        return 'Invalid';
      }
      return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid';
    }
  };
  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  const serviceColors: Record<string, string> = {
    airtime: '#22c55e',
    data: '#3b82f6',
    cable: '#f59e0b',
    electricity: '#ef4444',
    betting: '#8b5cf6',
    deposit: '#06b6d4',
  };

  const pieData = data ? Object.entries(data.serviceBreakdown)
    .filter(([key, val]) => key !== 'deposit' && val.count > 0)
    .map(([name, val]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: val.volume,
      revenue: val.revenue,
      count: val.count,
    })) : [];

  if (loading && !data) {
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
              <Link href="/admin" className="text-gray-400 hover:text-white">
                ← Back to Dashboard
              </Link>
              <span className="text-white font-semibold">📊 Analytics</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Date Range Selector */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-gray-400 text-sm">Date Range:</span>
              {(['today', '7d', '30d', '90d', 'custom'] as DateRange[]).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={range === r ? 'default' : 'outline'}
                  onClick={() => setRange(r)}
                  className={range === r ? 'bg-green-600' : 'border-gray-600 text-gray-300'}
                >
                  {r === 'today' ? 'Today' : r === 'custom' ? 'Custom' : `Last ${r.replace('d', ' days')}`}
                </Button>
              ))}

              {range === 'custom' && (
                <div className="flex items-center gap-2 ml-4">
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white w-36"
                  />
                  <span className="text-gray-400">to</span>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white w-36"
                  />
                </div>
              )}

              {loading && <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin ml-2" />}
            </div>
          </CardContent>
        </Card>

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-600 to-emerald-700 border-0">
                <CardContent className="p-4">
                  <p className="text-white/80 text-xs">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(data.summary.totalRevenue)}</p>
                  <p className="text-white/60 text-xs mt-1">Avg: {formatCurrency(data.summary.avgDailyRevenue)}/day</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
                <CardContent className="p-4">
                  <p className="text-white/80 text-xs">Total Deposits</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(data.summary.totalDeposits)}</p>
                  <p className="text-white/60 text-xs mt-1">From wallet funding</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
                <CardContent className="p-4">
                  <p className="text-white/80 text-xs">Transactions</p>
                  <p className="text-2xl font-bold text-white">{data.summary.totalTransactions.toLocaleString()}</p>
                  <p className="text-white/60 text-xs mt-1">Avg: {data.summary.avgDailyTransactions}/day</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0">
                <CardContent className="p-4">
                  <p className="text-white/80 text-xs">New Users</p>
                  <p className="text-2xl font-bold text-white">{data.summary.newUsers}</p>
                  <p className="text-white/60 text-xs mt-1">Signups in period</p>
                </CardContent>
              </Card>
            </div>


            {/* Revenue Trend Chart */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  📈 Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        stroke="#9ca3af"
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                        stroke="#9ca3af"
                        fontSize={12}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value) || 0)}
                        labelFormatter={formatDate}
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="deposits" name="Deposits" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Volume & User Growth */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">💳 Transaction Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip
                          labelFormatter={formatDate}
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                        />
                        <Bar dataKey="transactions" name="Transactions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">👥 User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip
                          labelFormatter={formatDate}
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                        />
                        <Bar dataKey="users" name="New Users" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Breakdown & Peak Hours */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">🎯 Service Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(Number(value) || 0)}
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-gray-400 text-center w-full">No service data in this period</p>
                    )}
                  </div>
                  {/* Service stats table */}
                  <div className="mt-4 space-y-2">
                    {Object.entries(data.serviceBreakdown)
                      .filter(([key]) => key !== 'deposit')
                      .map(([name, val]) => (
                        <div key={name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: serviceColors[name] }} />
                            <span className="text-gray-300 capitalize">{name}</span>
                          </div>
                          <div className="flex gap-4 text-gray-400">
                            <span>{val.count} txns</span>
                            <span className="text-green-400">{formatCurrency(val.revenue)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center justify-between">
                    <span>⏰ Peak Hours</span>
                    <span className="text-sm font-normal text-green-400">
                      Peak: {formatHour(data.summary.peakHour)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={formatHour}
                          stroke="#9ca3af"
                          fontSize={10}
                          interval={2}
                        />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip
                          labelFormatter={(h) => formatHour(h as number)}
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                        />
                        <Bar
                          dataKey="transactions"
                          name="Transactions"
                          fill="#f59e0b"
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-gray-400 text-xs mt-2 text-center">
                    Transaction distribution by hour of day
                  </p>
                </CardContent>
              </Card>
            </div>


            {/* Service Volume Breakdown */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">📊 Daily Service Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" fontSize={11} />
                      <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} stroke="#9ca3af" fontSize={11} />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value) || 0)}
                        labelFormatter={formatDate}
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      />
                      <Legend />
                      <Bar dataKey="airtime" name="Airtime" stackId="a" fill="#22c55e" />
                      <Bar dataKey="data" name="Data" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="bills" name="Bills" stackId="a" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">💡 Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Top Service</p>
                    <p className="text-white font-semibold capitalize">{data.summary.topService.name || 'N/A'}</p>
                    <p className="text-green-400 text-sm">{formatCurrency(data.summary.topService.volume)} volume</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Peak Activity</p>
                    <p className="text-white font-semibold">{formatHour(data.summary.peakHour)}</p>
                    <p className="text-blue-400 text-sm">Most transactions</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Conversion</p>
                    <p className="text-white font-semibold">
                      {data.summary.newUsers > 0
                        ? `${((data.summary.totalTransactions / data.summary.newUsers) || 0).toFixed(1)} txns/user`
                        : 'N/A'}
                    </p>
                    <p className="text-purple-400 text-sm">Avg transactions per new user</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
