'use client';

import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendUp, TrendDown, CurrencyNgn, CreditCard, Broadcast } from '@phosphor-icons/react';
import { useState } from 'react';

// --- Types ---
interface ChartDataPoint {
    date: string;
    estimatedEarnings: number;
    deposits: number;
    grossVolume: number;
    transactions: number;
    users: number;
    [key: string]: string | number;
}

interface AnalyticsChartsProps {
    data: ChartDataPoint[];
    serviceBreakdown?: { name: string; value: number; color?: string }[];
    loading?: boolean;
    trends?: { estimatedEarnings: number;[key: string]: number };
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

    const earningsTrend = trends?.estimatedEarnings || 0;
    const isPositive = earningsTrend >= 0;

    return (
        <div className="space-y-6">
            {/* Revenue Area Chart */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-gray-700/30 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <CurrencyNgn className="text-green-500 w-5 h-5" weight="bold" />
                            Earnings & Deposits Trend
                        </CardTitle>
                        <div className="flex gap-2">
                            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isPositive ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                {isPositive ? <TrendUp weight="bold" /> : <TrendDown weight="bold" />}
                                {earningsTrend > 0 ? '+' : ''}{earningsTrend}% vs last period
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
                                    dataKey="estimatedEarnings"
                                    name="Est. Earnings"
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
                                <Area
                                    type="monotone"
                                    dataKey="grossVolume"
                                    name="Gross Volume"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    fill="none"
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

                {/* Service Breakdown - Horizontal Bar Chart */}
                <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <Broadcast className="text-green-500 w-5 h-5" weight="bold" />
                            Service Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            {(!serviceBreakdown || serviceBreakdown.length === 0) ? (
                                <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data available</div>
                            ) : (
                                <div className="space-y-4">
                                    {serviceBreakdown.map((item, index) => {
                                        const total = serviceBreakdown.reduce((sum, i) => sum + i.value, 0);
                                        const percentage = total > 0 ? (item.value / total) * 100 : 0;
                                        return (
                                            <div key={item.name} className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-300 capitalize">{item.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-gray-500 text-xs">{percentage.toFixed(1)}%</span>
                                                        <span className="text-white font-medium">₦{item.value.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${percentage}%`,
                                                            backgroundColor: COLORS[index % COLORS.length]
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="pt-4 border-t border-gray-700/50 flex justify-between items-center">
                                        <span className="text-gray-400 text-sm">Total Volume</span>
                                        <span className="text-white font-bold text-lg">
                                            ₦{serviceBreakdown.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
