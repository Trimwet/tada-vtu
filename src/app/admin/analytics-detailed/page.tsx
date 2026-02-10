"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendUp, TrendDown, Download } from "@phosphor-icons/react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Analytics {
  period: string;
  startDate: string;
  endDate: string;
  revenue: {
    totalDeposits: number;
    depositFees: number;
    airtimeRevenue: number;
    airtimeMargin: number;
    dataRevenue: number;
    dataMargin: number;
    cableRevenue: number;
    cableMargin: number;
    electricityRevenue: number;
    electricityMargin: number;
    totalMargins: number;
    totalRevenue: number;
    netProfit: number;
  };
  costs: {
    airtimeCost: number;
    dataCost: number;
    cableCost: number;
    electricityCost: number;
    flutterwaveFees: number;
    totalCosts: number;
  };
  volume: {
    totalTransactions: number;
    depositCount: number;
    airtimeCount: number;
    dataCount: number;
    cableCount: number;
    electricityCount: number;
    withdrawalCount: number;
    totalWithdrawals: number;
  };
  networks: {
    MTN: { count: number; volume: number; revenue: number };
    AIRTEL: { count: number; volume: number; revenue: number };
    GLO: { count: number; volume: number; revenue: number };
    "9MOBILE": { count: number; volume: number; revenue: number };
  };
  daily: Array<{
    date: string;
    deposits: number;
    purchases: number;
    revenue: number;
    transactions: number;
  }>;
  hourly: Array<{
    hour: number;
    transactions: number;
    revenue: number;
  }>;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DetailedAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [users, setUsers] = useState({ total: 0, new: 0 });

  useEffect(() => {
    fetchAnalytics();
  }, [period, startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      let url = `/api/admin/analytics?period=${period}`;
      if (period === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch analytics");

      const data = await response.json();
      setAnalytics(data.analytics);
      setUsers(data.users);
    } catch (error) {
      console.error("Analytics error:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const csv = [
      ["Metric", "Value"],
      ["Period", analytics.period],
      ["Start Date", analytics.startDate],
      ["End Date", analytics.endDate],
      [""],
      ["REVENUE"],
      ["Total Deposits", `₦${analytics.revenue.totalDeposits.toLocaleString()}`],
      ["Deposit Fees (1%)", `₦${analytics.revenue.depositFees.toLocaleString()}`],
      ["Airtime Sales", `₦${analytics.revenue.airtimeRevenue.toLocaleString()}`],
      ["Airtime Margin (2.5%)", `₦${analytics.revenue.airtimeMargin.toLocaleString()}`],
      ["Data Sales", `₦${analytics.revenue.dataRevenue.toLocaleString()}`],
      ["Data Margin (5%)", `₦${analytics.revenue.dataMargin.toLocaleString()}`],
      ["Total Margins", `₦${analytics.revenue.totalMargins.toLocaleString()}`],
      ["Total Revenue", `₦${analytics.revenue.totalRevenue.toLocaleString()}`],
      ["Net Profit", `₦${analytics.revenue.netProfit.toLocaleString()}`],
      [""],
      ["COSTS"],
      ["Airtime Cost", `₦${analytics.costs.airtimeCost.toLocaleString()}`],
      ["Data Cost", `₦${analytics.costs.dataCost.toLocaleString()}`],
      ["Flutterwave Fees", `₦${analytics.costs.flutterwaveFees.toLocaleString()}`],
      ["Total Costs", `₦${analytics.costs.totalCosts.toLocaleString()}`],
      [""],
      ["VOLUME"],
      ["Total Transactions", analytics.volume.totalTransactions],
      ["Deposits", analytics.volume.depositCount],
      ["Airtime", analytics.volume.airtimeCount],
      ["Data", analytics.volume.dataCount],
      ["Withdrawals", analytics.volume.withdrawalCount],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${analytics.period}-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!analytics) return null;

  // Prepare chart data
  const revenueBreakdown = [
    { name: "Deposit Fees", value: analytics.revenue.depositFees },
    { name: "Airtime Margin", value: analytics.revenue.airtimeMargin },
    { name: "Data Margin", value: analytics.revenue.dataMargin },
    { name: "Cable Margin", value: analytics.revenue.cableMargin },
    { name: "Electricity Margin", value: analytics.revenue.electricityMargin },
  ].filter((item) => item.value > 0);

  const networkData = Object.entries(analytics.networks)
    .map(([name, data]) => ({
      name,
      transactions: data.count,
      volume: data.volume,
      revenue: data.revenue,
    }))
    .filter((item) => item.transactions > 0);

  const profitMargin = analytics.revenue.totalRevenue > 0
    ? ((analytics.revenue.netProfit / analytics.revenue.totalRevenue) * 100).toFixed(2)
    : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">📊 Detailed Analytics</h1>
              <p className="text-gray-400">Complete money flow analysis</p>
            </div>
          </div>
          <Button
            onClick={exportToCSV}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-400 mb-2 block">Period</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="bg-gray-900 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === "custom" && (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm text-gray-400 mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-gray-900 border-gray-700"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm text-gray-400 mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-gray-900 border-gray-700"
                    />
                  </div>
                </>
              )}

              <Button onClick={fetchAnalytics} className="bg-green-500 hover:bg-green-600 text-black">
                Apply Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/80 text-sm">Net Profit</p>
                <TrendUp className="w-5 h-5 text-white" weight="bold" />
              </div>
              <p className="text-3xl font-bold text-white">
                ₦{analytics.revenue.netProfit.toLocaleString()}
              </p>
              <p className="text-white/60 text-xs mt-1">Margin: {profitMargin}%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/80 text-sm">Total Revenue</p>
                <TrendUp className="w-5 h-5 text-white" weight="bold" />
              </div>
              <p className="text-3xl font-bold text-white">
                ₦{analytics.revenue.totalRevenue.toLocaleString()}
              </p>
              <p className="text-white/60 text-xs mt-1">
                Fees + Margins
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/80 text-sm">Total Deposits</p>
                <TrendUp className="w-5 h-5 text-white" weight="bold" />
              </div>
              <p className="text-3xl font-bold text-white">
                ₦{analytics.revenue.totalDeposits.toLocaleString()}
              </p>
              <p className="text-white/60 text-xs mt-1">
                {analytics.volume.depositCount} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/80 text-sm">Total Costs</p>
                <TrendDown className="w-5 h-5 text-white" weight="bold" />
              </div>
              <p className="text-3xl font-bold text-white">
                ₦{analytics.costs.totalCosts.toLocaleString()}
              </p>
              <p className="text-white/60 text-xs mt-1">
                VTU + Gateway fees
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Revenue Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `₦${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Network Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={networkData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    formatter={(value: number) => `₦${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Daily Trend */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Daily Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: number) => `₦${value.toLocaleString()}`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="deposits" stroke="#3b82f6" strokeWidth={2} name="Deposits" />
                <Line type="monotone" dataKey="purchases" stroke="#f59e0b" strokeWidth={2} name="Purchases" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Details */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="py-2 text-gray-400">Deposit Fees (1%)</td>
                    <td className="py-2 text-right text-green-400 font-semibold">
                      ₦{analytics.revenue.depositFees.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-400">Airtime Margin (2.5%)</td>
                    <td className="py-2 text-right text-green-400 font-semibold">
                      ₦{analytics.revenue.airtimeMargin.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-400">Data Margin (5%)</td>
                    <td className="py-2 text-right text-green-400 font-semibold">
                      ₦{analytics.revenue.dataMargin.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-400">Cable Margin (0.5%)</td>
                    <td className="py-2 text-right text-green-400 font-semibold">
                      ₦{analytics.revenue.cableMargin.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-400">Electricity Margin (0.5%)</td>
                    <td className="py-2 text-right text-green-400 font-semibold">
                      ₦{analytics.revenue.electricityMargin.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-gray-600">
                    <td className="py-2 text-white font-bold">Total Revenue</td>
                    <td className="py-2 text-right text-green-400 font-bold text-lg">
                      ₦{analytics.revenue.totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Cost Details */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="py-2 text-gray-400">Airtime Cost (97.5%)</td>
                    <td className="py-2 text-right text-red-400 font-semibold">
                      ₦{analytics.costs.airtimeCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-400">Data Cost (95%)</td>
                    <td className="py-2 text-right text-red-400 font-semibold">
                      ₦{analytics.costs.dataCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-400">Cable Cost (99.5%)</td>
                    <td className="py-2 text-right text-red-400 font-semibold">
                      ₦{analytics.costs.cableCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-400">Electricity Cost (99.5%)</td>
                    <td className="py-2 text-right text-red-400 font-semibold">
                      ₦{analytics.costs.electricityCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-400">Flutterwave Fees (~1%)</td>
                    <td className="py-2 text-right text-red-400 font-semibold">
                      ₦{analytics.costs.flutterwaveFees.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-gray-600">
                    <td className="py-2 text-white font-bold">Total Costs</td>
                    <td className="py-2 text-right text-red-400 font-bold text-lg">
                      ₦{analytics.costs.totalCosts.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Volume */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Transaction Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                <p className="text-gray-400 text-sm">Deposits</p>
                <p className="text-2xl font-bold text-white">{analytics.volume.depositCount}</p>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                <p className="text-gray-400 text-sm">Airtime</p>
                <p className="text-2xl font-bold text-white">{analytics.volume.airtimeCount}</p>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                <p className="text-gray-400 text-sm">Data</p>
                <p className="text-2xl font-bold text-white">{analytics.volume.dataCount}</p>
              </div>
              <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                <p className="text-gray-400 text-sm">Withdrawals</p>
                <p className="text-2xl font-bold text-white">{analytics.volume.withdrawalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
