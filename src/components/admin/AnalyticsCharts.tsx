'use client';

import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendUp, TrendDown, CurrencyNgn, CreditCard, Broadcast } from '@phosphor-icons/react';
import { useState } from 'react';

// --- Types ---
interface ChartDataPoint {
    date: string;
    revenue: number;
    deposits: number;
    transactions: number;
    users: number;
    [key: string]: string | number;
}

interface AnalyticsChartsProps {
    data: ChartDataPoint[];
    serviceBreakdown?: { name: string; value: number; color?: string }[];
    loading?: boolean;
    trends?: { revenue: number;[key: string]: number };
}

// --- Constants ---
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900/95 border border-gray-700 p-3 rounded-lg shadow-xl backdrop-blur-md">
                <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm mb-1 last:mb-0">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-300 capitalize">
                            {entry.name}:
                        </span>
                        <span className="text-white font-bold font-mono">
                            {formatter ? formatter(entry.value) : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export function AnalyticsCharts({ data, serviceBreakdown, loading, trends }: AnalyticsChartsProps) {
    const [focusBar, setFocusBar] = useState<number | null>(null);

    const formatCurrency = (val: number) => `₦${val.toLocaleString()}`;
    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
        } catch { return dateStr; }
    };

    if (loading) {
        return <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-80 bg-gray-800/50 rounded-xl" />
            <div className="h-80 bg-gray-800/50 rounded-xl" />
        </div>;
    }

    const revenueTrend = trends?.revenue || 0;
    const isPositive = revenueTrend >= 0;

    return (
        <div className="space-y-6">
            {/* Revenue Area Chart */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-gray-700/30 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <CurrencyNgn className="text-green-500 w-5 h-5" weight="bold" />
                            Revenue & Deposits Trend
                        </CardTitle>
                        <div className="flex gap-2">
                            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isPositive ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                {isPositive ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
                                {revenueTrend > 0 ? '+' : ''}{revenueTrend}% vs last period
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 pt-6">
                    <div className="h-[350px] w-full px-4 pb-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDate}
                                    stroke="#9ca3af"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tickFormatter={(val) => `₦${(val / 1000).toFixed(0)}k`}
                                    stroke="#9ca3af"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} cursor={{ stroke: '#4b5563', strokeDasharray: '4 4' }} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Revenue"
                                    stroke="#22c55e"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="deposits"
                                    name="Deposits"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorDeposits)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transaction Volume Bar Chart */}
                <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <CreditCard className="text-purple-500 w-5 h-5" weight="bold" />
                            Transaction Volume
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} onMouseMove={(state: any) => {
                                    if (state.isTooltipActive) {
                                        setFocusBar(state.activeTooltipIndex);
                                    } else {
                                        setFocusBar(null);
                                    }
                                }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" fontSize={11} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={11} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={<CustomTooltip />}
                                    />
                                    <Bar dataKey="transactions" name="Txns" radius={[4, 4, 0, 0]}>
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={focusBar === index ? '#a78bfa' : '#8b5cf6'}
                                                className="transition-all duration-300"
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Service Breakdown Donut Chart */}
                <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <Broadcast className="text-orange-500 w-5 h-5" weight="bold" />
                            Service Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full flex items-center justify-center relative">
                            {(!serviceBreakdown || serviceBreakdown.length === 0) ? (
                                <div className="text-gray-500 text-sm">No data available</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={serviceBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {serviceBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={<CustomTooltip formatter={formatCurrency} />}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            formatter={(value, entry: any) => <span className="text-gray-300 ml-1">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                            {/* Center Text */}
                            {serviceBreakdown && serviceBreakdown.length > 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-gray-400 text-xs">Total</p>
                                    <p className="text-white font-bold text-lg">
                                        ₦{(serviceBreakdown.reduce((sum, item) => sum + item.value, 0) / 1000000).toFixed(1)}M
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
