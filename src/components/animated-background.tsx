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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Defer initialization to after page load
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Colors - simplified green theme
    const colors = [
      "rgba(34, 197, 94, 0.1)",
      "rgba(16, 185, 129, 0.08)",
      "rgba(52, 211, 153, 0.06)",
    ];

    // Initialize shapes - reduced count for better performance
    const initShapes = () => {
      const shapeCount = window.innerWidth < 768 ? 8 : 15;
      const shapes: Shape[] = [];

      for (let i = 0; i < shapeCount; i++) {
        shapes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 30 + 10,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.15 + 0.03,
          type: Math.random() > 0.5 ? "circle" : "square",
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      shapesRef.current = shapes;
    };
    initShapes();

    // Draw functions - simplified
    const drawCircle = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.size / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawSquare = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      ctx.fillRect(shape.x - shape.size / 2, shape.y - shape.size / 2, shape.size, shape.size);
    };

    // Simplified animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      shapesRef.current.forEach((shape) => {
        // Update position
        shape.x += shape.speedX;
        shape.y += shape.speedY;

        // Wrap around edges
        if (shape.x < -shape.size) shape.x = canvas.width + shape.size;
        if (shape.x > canvas.width + shape.size) shape.x = -shape.size;
        if (shape.y < -shape.size) shape.y = canvas.height + shape.size;
        if (shape.y > canvas.height + shape.size) shape.y = -shape.size;

        // Draw shape
        ctx.fillStyle = shape.color;
        if (shape.type === "circle") {
          drawCircle(ctx, shape);
        } else {
          drawSquare(ctx, shape);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isLoaded]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  );
}
