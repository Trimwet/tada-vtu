"use client";

import { useEffect, useRef, useState } from "react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* Electric Lightning Spinner */}
        <ElectricSpinner size={56} />

        {/* Message */}
        <p className="text-foreground font-medium text-sm">{message}</p>
      </div>
    </div>
  );
}

// Electric Lightning Spinner - Fast, energetic, electric effect
function ElectricSpinner({ size = 64 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 8;

    // Lightning bolts traveling around the circle
    interface Bolt {
      angle: number;
      speed: number;
      intensity: number;
      jitter: number[];
      length: number;
    }

    const bolts: Bolt[] = [];

    // Create initial bolts
    const createBolt = (angle: number) => ({
      angle,
      speed: 0.25 + Math.random() * 0.15, // Much faster rotation
      intensity: 0.8 + Math.random() * 0.2,
      jitter: Array.from({ length: 6 }, () => (Math.random() - 0.5) * 3),
      length: 0.25 + Math.random() * 0.15, // Shorter arc length
    });

    // Start with 3 bolts evenly spaced
    bolts.push(createBolt(0));
    bolts.push(createBolt(Math.PI * 0.66));
    bolts.push(createBolt(Math.PI * 1.33));

    let frameCount = 0;

    const drawBolt = (bolt: Bolt) => {
      const segments = 8;
      
      // Main lightning arc - thinner
      ctx.beginPath();
      ctx.strokeStyle = `rgba(74, 222, 128, ${bolt.intensity})`;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(34, 197, 94, 0.8)";
      ctx.shadowBlur = 8;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = bolt.angle + t * bolt.length;
        const jitterIdx = Math.floor(t * (bolt.jitter.length - 1));
        const jitterVal = bolt.jitter[jitterIdx] * (1 - Math.abs(t - 0.5) * 1.5);
        
        const r = radius + jitterVal;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Bright core - thinner
      ctx.beginPath();
      ctx.strokeStyle = `rgba(187, 247, 208, ${bolt.intensity * 0.8})`;
      ctx.lineWidth = 0.5;
      ctx.shadowBlur = 4;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = bolt.angle + t * bolt.length;
        const jitterIdx = Math.floor(t * (bolt.jitter.length - 1));
        const jitterVal = bolt.jitter[jitterIdx] * 0.5 * (1 - Math.abs(t - 0.5) * 1.5);
        
        const r = radius + jitterVal;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.shadowBlur = 0;
    };

    const drawBaseRing = () => {
      // Subtle base ring - thinner
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawCenterPulse = () => {
      const pulse = 0.5 + Math.sin(frameCount * 0.2) * 0.3;
      const pulseSize = 4 + pulse * 3;
      
      // Outer glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseSize + 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 197, 94, ${0.2 * pulse})`;
      ctx.fill();

      // Inner core
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(74, 222, 128, ${0.6 + pulse * 0.4})`;
      ctx.shadowColor = "rgba(34, 197, 94, 0.8)";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const animate = () => {
      ctx.clearRect(0, 0, size, size);

      drawBaseRing();

      // Update and draw bolts
      bolts.forEach(bolt => {
        bolt.angle += bolt.speed;
        
        // Regenerate jitter for crackling effect
        if (Math.random() < 0.5) {
          const idx = Math.floor(Math.random() * bolt.jitter.length);
          bolt.jitter[idx] = (Math.random() - 0.5) * 6;
        }

        drawBolt(bolt);
      });

      drawCenterPulse();

      frameCount++;
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [size, mounted]);

  // Both SSR and client render the same container, canvas only draws when mounted
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {!mounted ? (
        <>
          <div className="absolute inset-0 rounded-full border border-green-500/20" />
          <div className="absolute inset-0 rounded-full border border-transparent border-t-green-500 animate-spin" />
        </>
      ) : (
        <canvas ref={canvasRef} className="w-full h-full" />
      )}
    </div>
  );
}

// Inline spinner for buttons and small areas
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return <ElectricSpinner size={sizes[size]} />;
}

// Card/Section loading skeleton
export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
