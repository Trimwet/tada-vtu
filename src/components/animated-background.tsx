"use client";

import { useEffect, useRef, useState } from "react";

interface Shape {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  type: "circle" | "square";
  color: string;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef<Shape[]>([]);
  const animationRef = useRef<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only start animation when component is visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Optimize canvas settings
    ctx.imageSmoothingEnabled = false;

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limit DPR for performance
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();

    // Reduced colors for better performance
    const colors = [
      "rgba(34, 197, 94, 0.08)",  // green-500
      "rgba(16, 185, 129, 0.06)", // emerald-500
      "rgba(52, 211, 153, 0.04)",  // emerald-400
    ];

    // Initialize fewer shapes for better performance
    const initShapes = () => {
      const shapes: Shape[] = [];
      const shapeCount = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 80000), 15); // Reduced count

      for (let i = 0; i < shapeCount; i++) {
        shapes.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 30 + 10, // Smaller sizes
          speedX: (Math.random() - 0.5) * 0.3, // Slower movement
          speedY: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.15 + 0.05, // Lower opacity
          type: Math.random() > 0.5 ? "circle" : "square", // Only 2 types
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      shapesRef.current = shapes;
    };
    initShapes();

    // Optimized draw functions
    const drawCircle = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.size / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawSquare = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      ctx.fillRect(shape.x - shape.size / 2, shape.y - shape.size / 2, shape.size, shape.size);
    };

    // Optimized animation loop with reduced frame rate
    let lastTime = 0;
    const targetFPS = 30; // Reduced from 60fps
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      if (currentTime - lastTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      shapesRef.current.forEach((shape) => {
        // Update position
        shape.x += shape.speedX;
        shape.y += shape.speedY;

        // Wrap around edges
        if (shape.x < -shape.size) shape.x = window.innerWidth + shape.size;
        if (shape.x > window.innerWidth + shape.size) shape.x = -shape.size;
        if (shape.y < -shape.size) shape.y = window.innerHeight + shape.size;
        if (shape.y > window.innerHeight + shape.size) shape.y = -shape.size;

        // Set fill style
        ctx.fillStyle = shape.color;

        // Draw shape
        if (shape.type === "circle") {
          drawCircle(ctx, shape);
        } else {
          drawSquare(ctx, shape);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Cleanup resize listener
    const handleResize = () => {
      resizeCanvas();
      initShapes();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  );
}

// Lightweight floating particles - even more optimized
export function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    speedY: number;
    opacity: number;
  }>>([]);
  const animationRef = useRef<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    // Initialize fewer particles
    const initParticles = () => {
      const particles = [];
      const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 50000), 20);

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 2 + 1, // Smaller particles
          speedY: Math.random() * 0.3 + 0.1, // Slower movement
          opacity: Math.random() * 0.3 + 0.1,
        });
      }
      particlesRef.current = particles;
    };
    initParticles();

    // Reduced frame rate animation
    let lastTime = 0;
    const frameInterval = 1000 / 20; // 20fps for particles

    const animate = (currentTime: number) => {
      if (currentTime - lastTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particlesRef.current.forEach((p) => {
        p.y -= p.speedY;

        if (p.y < -10) {
          p.y = window.innerHeight + 10;
          p.x = Math.random() * window.innerWidth;
        }

        // Simple circle draw - no gradients for performance
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 197, 94, ${p.opacity})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
