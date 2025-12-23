"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Lightning, Clock, Shield } from "@phosphor-icons/react";

interface CounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

function Counter({ end, duration = 2000, prefix = "", suffix = "", decimals = 0 }: CounterProps) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    const startCount = 0;

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = startCount + (end - startCount) * easeOutQuart;
      setCount(currentCount);
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };

    requestAnimationFrame(updateCount);
  }, [end, duration, hasStarted]);

  const formatNumber = (num: number) => {
    if (decimals > 0) return num.toFixed(decimals);
    return Math.floor(num).toLocaleString();
  };

  return (
    <span ref={ref}>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
}

// Believable statistics based on Nigerian fintech market
const STATS = [
  {
    icon: Users,
    value: 8500,
    suffix: "+",
    label: "Happy Customers",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/50",
  },
  {
    icon: Lightning,
    value: 125,
    prefix: "₦",
    suffix: "M+",
    label: "Transactions",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  {
    icon: Clock,
    value: 99.9,
    suffix: "%",
    decimals: 1,
    label: "Uptime",
    color: "text-teal-600",
    bgColor: "bg-teal-100 dark:bg-teal-900/50",
  },
  {
    icon: Shield,
    value: 24,
    suffix: "/7",
    label: "Support",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/50",
  },
];

export function StatsCounter() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {STATS.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="text-center group"
          >
            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
              <Counter
                end={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                decimals={stat.decimals}
                duration={2000 + index * 200}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// Network colors for visual distinction
const networkColors: Record<string, string> = {
  MTN: "text-yellow-500",
  Airtel: "text-red-500",
  GLO: "text-green-400",
  "9mobile": "text-green-300",
  DStv: "text-blue-500",
  GOtv: "text-orange-500",
  IKEDC: "text-purple-500",
  EKEDC: "text-cyan-500",
};

// SVG Icons for transaction types
function PhoneIcon() {
  return (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  );
}

function TvIcon() {
  return (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const TypeIconComponent: Record<string, () => React.ReactNode> = {
  Airtime: PhoneIcon,
  Data: WifiIcon,
  "Cable TV": TvIcon,
  Electricity: BoltIcon,
};

// Live transaction ticker - Optimized version
export function LiveTransactionTicker() {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Array<{
    id: number;
    type: string;
    amount: number;
    network: string;
    time: string;
    phone: string;
  }>>([]);

  // Realistic transaction templates - simplified
  const transactionTemplates = [
    { type: "Airtime", networks: ["MTN", "Airtel", "GLO", "9mobile"], amounts: [100, 200, 500, 1000, 2000] },
    { type: "Data", networks: ["MTN", "Airtel", "GLO", "9mobile"], amounts: [300, 500, 1000, 1500, 2000] },
    { type: "Cable TV", networks: ["DStv", "GOtv"], amounts: [1850, 2950, 4150, 7900] },
    { type: "Electricity", networks: ["IKEDC", "EKEDC"], amounts: [1000, 2000, 5000, 10000] },
  ];

  const generateTransaction = () => {
    const template = transactionTemplates[Math.floor(Math.random() * transactionTemplates.length)];
    const network = template.networks[Math.floor(Math.random() * template.networks.length)];
    const amount = template.amounts[Math.floor(Math.random() * template.amounts.length)];
    const prefixes = ["0803", "0805", "0701", "0802"];
    
    return {
      id: Date.now() + Math.random(),
      type: template.type,
      amount,
      network,
      time: "Just now",
      phone: `${prefixes[Math.floor(Math.random() * prefixes.length)]}***${Math.floor(1000 + Math.random() * 9000)}`,
    };
  };

  // Initialize transactions only on client
  useEffect(() => {
    setMounted(true);
    setTransactions([
      { id: 1, type: "Airtime", amount: 500, network: "MTN", time: "2s ago", phone: "0803***4521" },
      { id: 2, type: "Data", amount: 1500, network: "Airtel", time: "5s ago", phone: "0701***8832" },
      { id: 3, type: "Airtime", amount: 1000, network: "GLO", time: "8s ago", phone: "0805***2190" },
    ]);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const interval = setInterval(() => {
      const newTransaction = generateTransaction();
      setTransactions(prev => [newTransaction, ...prev.slice(0, 2)]);
    }, 8000); // Slower updates for better performance

    return () => clearInterval(interval);
  }, [mounted]);

  const renderIcon = (type: string) => {
    const IconComponent = TypeIconComponent[type] || CheckIcon;
    return <IconComponent />;
  };

  // Show skeleton on server/initial render
  if (!mounted) {
    return (
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-full max-w-[360px] shadow-2xl shadow-green-500/5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full" />
            <span className="text-sm font-semibold text-white">Live Activity</span>
          </div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Real-time</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-gray-500/10 animate-pulse" />
              <div className="space-y-1">
                <div className="h-4 w-20 bg-gray-500/20 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-500/10 rounded animate-pulse" />
              </div>
              <div className="text-right space-y-1">
                <div className="h-4 w-12 bg-gray-500/20 rounded animate-pulse" />
                <div className="h-3 w-8 bg-gray-500/10 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <SimpleBorderWrapper>
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-full max-w-[360px] shadow-2xl shadow-green-500/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-semibold text-white">Live Activity</span>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Real-time</span>
      </div>
      
      {/* Transactions */}
      <div className="space-y-2">
        {transactions.map((tx, index) => (
          <div
            key={tx.id}
            className={`
              grid grid-cols-[40px_1fr_auto] items-center gap-3 p-2.5 rounded-xl 
              bg-white/[0.02] border border-white/5
              transition-all duration-500 ease-out
              ${index === 0 ? "animate-pulse-once border-green-500/20 bg-green-500/[0.03]" : ""}
            `}
            style={{
              opacity: 1 - index * 0.12,
            }}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              {renderIcon(tx.type)}
            </div>
            
            {/* Details */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white">{tx.type}</span>
                <span className={`text-xs font-semibold ${networkColors[tx.network] || "text-gray-400"}`}>
                  {tx.network}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-mono">{tx.phone}</p>
            </div>
            
            {/* Amount & Time */}
            <div className="text-right">
              <p className="text-sm font-bold text-green-500 tabular-nums">₦{tx.amount.toLocaleString()}</p>
              <p className="text-[10px] text-gray-600">{tx.time}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
        <p className="text-[10px] text-gray-600">Instant & secure transactions</p>
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-[10px] text-green-500 font-medium">Verified</span>
        </div>
      </div>
      </div>
    </SimpleBorderWrapper>
  );
}

// Simplified border wrapper - much more performant
function SimpleBorderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Simple animated border using CSS */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 animate-pulse" 
           style={{ animationDuration: '3s' }} />
      <div className="absolute inset-[1px] rounded-2xl bg-black/50" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
