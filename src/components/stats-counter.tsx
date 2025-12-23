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

// Live transaction ticker - Dark theme optimized with ECG border
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

  // Realistic transaction templates with correct type-network-amount combinations
  const transactionTemplates = [
    // Airtime - mobile networks only, realistic amounts (₦100-₦5000)
    { type: "Airtime", networks: ["MTN", "Airtel", "GLO", "9mobile"], amounts: [100, 200, 500, 1000, 2000, 3000, 5000] },
    // Data - mobile networks only, realistic data prices
    { type: "Data", networks: ["MTN", "Airtel", "GLO", "9mobile"], amounts: [300, 500, 1000, 1500, 2000, 3000, 5000] },
    // Cable TV - DStv/GOtv only, subscription amounts
    { type: "Cable TV", networks: ["DStv", "GOtv"], amounts: [1850, 2950, 4150, 7900, 12500, 15700, 21000] },
    // Electricity - disco companies, token amounts
    { type: "Electricity", networks: ["IKEDC", "EKEDC"], amounts: [1000, 2000, 3000, 5000, 10000, 15000, 20000] },
  ];

  const generateTransaction = () => {
    const template = transactionTemplates[Math.floor(Math.random() * transactionTemplates.length)];
    const network = template.networks[Math.floor(Math.random() * template.networks.length)];
    const amount = template.amounts[Math.floor(Math.random() * template.amounts.length)];
    const prefixes = ["0803", "0805", "0701", "0802", "0810", "0903", "0706", "0816", "0813"];
    
    return {
      id: Date.now() + Math.random(),
      type: template.type,
      amount,
      network,
      time: "Just now",
      phone: `${prefixes[Math.floor(Math.random() * prefixes.length)]}***${Math.floor(1000 + Math.random() * 9000)}`,
    };
  };

  // Initialize transactions only on client to avoid hydration mismatch
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
    }, 5000);

    return () => clearInterval(interval);
  }, [mounted]);

  const renderIcon = (type: string) => {
    const IconComponent = TypeIconComponent[type] || CheckIcon;
    return <IconComponent />;
  };

  // Show skeleton on server/initial render to avoid hydration mismatch
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
    <EcgBorderWrapper>
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
    </EcgBorderWrapper>
  );
}

// Electric Border Wrapper Component - Fluid lightning effect
function EcgBorderWrapper({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    const borderRadius = 16;
    const padding = 4;

    // Lightning bolt particles traveling around the border
    interface Bolt {
      progress: number;
      speed: number;
      intensity: number;
      jitter: number[];
      life: number;
      maxLife: number;
      depth: number; // 3D depth layer (0-1, closer = brighter/faster)
    }

    const bolts: Bolt[] = [];
    
    // Spawn new bolts periodically
    const spawnBolt = () => {
      const depth = Math.random(); // 0 = far, 1 = close
      bolts.push({
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.012 + depth * 0.01, // Much faster! 4-6x speed increase
        intensity: 0.4 + depth * 0.6, // Closer = brighter
        jitter: Array.from({ length: 20 }, () => (Math.random() - 0.5) * (4 + depth * 4)), // Thinner jitter
        life: 0,
        maxLife: 40 + Math.random() * 60, // Shorter life for snappier feel
        depth,
      });
    };

    // Start with a few bolts
    for (let i = 0; i < 3; i++) spawnBolt();

    // Get point on rounded rectangle perimeter
    const getPerimeterPoint = (progress: number): { x: number; y: number; nx: number; ny: number } => {
      const w = canvas.width - padding * 2;
      const h = canvas.height - padding * 2;
      const r = Math.min(borderRadius, w / 2, h / 2);
      
      const straightW = w - 2 * r;
      const straightH = h - 2 * r;
      const cornerLen = (Math.PI * r) / 2;
      const total = 2 * straightW + 2 * straightH + 4 * cornerLen;
      
      let dist = (progress % 1) * total;
      const ox = padding;
      const oy = padding;

      // Top edge
      if (dist < straightW) {
        return { x: ox + r + dist, y: oy, nx: 0, ny: -1 };
      }
      dist -= straightW;

      // Top-right corner
      if (dist < cornerLen) {
        const a = (dist / cornerLen) * (Math.PI / 2);
        return {
          x: ox + w - r + Math.sin(a) * r,
          y: oy + r - Math.cos(a) * r,
          nx: Math.sin(a),
          ny: -Math.cos(a),
        };
      }
      dist -= cornerLen;

      // Right edge
      if (dist < straightH) {
        return { x: ox + w, y: oy + r + dist, nx: 1, ny: 0 };
      }
      dist -= straightH;

      // Bottom-right corner
      if (dist < cornerLen) {
        const a = (dist / cornerLen) * (Math.PI / 2);
        return {
          x: ox + w - r + Math.cos(a) * r,
          y: oy + h - r + Math.sin(a) * r,
          nx: Math.cos(a),
          ny: Math.sin(a),
        };
      }
      dist -= cornerLen;

      // Bottom edge
      if (dist < straightW) {
        return { x: ox + w - r - dist, y: oy + h, nx: 0, ny: 1 };
      }
      dist -= straightW;

      // Bottom-left corner
      if (dist < cornerLen) {
        const a = (dist / cornerLen) * (Math.PI / 2);
        return {
          x: ox + r - Math.sin(a) * r,
          y: oy + h - r + Math.cos(a) * r,
          nx: -Math.sin(a),
          ny: Math.cos(a),
        };
      }
      dist -= cornerLen;

      // Left edge
      if (dist < straightH) {
        return { x: ox, y: oy + h - r - dist, nx: -1, ny: 0 };
      }
      dist -= straightH;

      // Top-left corner
      const a = (dist / cornerLen) * (Math.PI / 2);
      return {
        x: ox + r - Math.cos(a) * r,
        y: oy + r - Math.sin(a) * r,
        nx: -Math.cos(a),
        ny: -Math.sin(a),
      };
    };

    // Draw a lightning segment with 3D depth
    const drawLightning = (bolt: Bolt) => {
      const segmentCount = 12; // Fewer segments for sharper look
      const fadeIn = Math.min(bolt.life / 10, 1); // Faster fade in
      const fadeOut = Math.max(0, 1 - (bolt.life - bolt.maxLife + 20) / 20);
      const alpha = bolt.intensity * fadeIn * fadeOut;

      if (alpha <= 0) return;

      // 3D depth affects size and blur - closer bolts are sharper and brighter
      const depthScale = 0.3 + bolt.depth * 0.7; // 0.3 to 1.0
      const mainWidth = 0.5 + bolt.depth * 0.8; // Thinner! 0.5 to 1.3px
      const glowWidth = 1 + bolt.depth * 1.5; // 1 to 2.5px glow
      const blurAmount = 3 + bolt.depth * 6; // Less blur for far, more for close

      // Main bright bolt - THIN and sharp
      ctx.beginPath();
      ctx.strokeStyle = `rgba(74, 222, 128, ${alpha * depthScale})`;
      ctx.lineWidth = mainWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = `rgba(34, 197, 94, ${0.6 + bolt.depth * 0.4})`;
      ctx.shadowBlur = blurAmount;

      for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const prog = bolt.progress - 0.02 + t * 0.04; // Shorter trail
        const point = getPerimeterPoint(prog);
        
        // Add jagged lightning jitter - scaled by depth
        const jitterIdx = Math.floor(t * (bolt.jitter.length - 1));
        const jitterVal = bolt.jitter[jitterIdx] * (1 - Math.abs(t - 0.5) * 2) * depthScale;
        
        const x = point.x + point.nx * jitterVal;
        const y = point.y + point.ny * jitterVal;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glow layer - also thinner
      ctx.beginPath();
      ctx.strokeStyle = `rgba(134, 239, 172, ${alpha * 0.4 * depthScale})`;
      ctx.lineWidth = glowWidth;
      ctx.shadowBlur = blurAmount * 1.5;

      for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const prog = bolt.progress - 0.02 + t * 0.04;
        const point = getPerimeterPoint(prog);
        const jitterIdx = Math.floor(t * (bolt.jitter.length - 1));
        const jitterVal = bolt.jitter[jitterIdx] * 0.4 * (1 - Math.abs(t - 0.5) * 2) * depthScale;
        
        const x = point.x + point.nx * jitterVal;
        const y = point.y + point.ny * jitterVal;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.shadowBlur = 0;
    };

    // Draw subtle base glow around border
    const drawBaseGlow = () => {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(34, 197, 94, 0.15)";
      ctx.lineWidth = 1;
      
      const steps = 100;
      for (let i = 0; i <= steps; i++) {
        const point = getPerimeterPoint(i / steps);
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    let frameCount = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawBaseGlow();

      // Sort bolts by depth (far ones first, close ones on top for 3D effect)
      bolts.sort((a, b) => a.depth - b.depth);

      // Update and draw bolts
      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i];
        bolt.progress += bolt.speed;
        bolt.life++;

        // Randomly regenerate jitter for crackling effect - thinner jitter
        if (Math.random() < 0.4) {
          const idx = Math.floor(Math.random() * bolt.jitter.length);
          bolt.jitter[idx] = (Math.random() - 0.5) * (4 + bolt.depth * 4);
        }

        drawLightning(bolt);

        // Remove dead bolts
        if (bolt.life > bolt.maxLife) {
          bolts.splice(i, 1);
        }
      }

      // Spawn new bolts more frequently for faster action
      if (frameCount % 15 === 0 && bolts.length < 8 && Math.random() < 0.8) {
        spawnBolt();
      }

      // Occasional burst of multiple bolts at different depths
      if (frameCount % 90 === 0 && Math.random() < 0.5) {
        for (let i = 0; i < 3; i++) spawnBolt();
      }

      frameCount++;
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />
      {children}
    </div>
  );
}
