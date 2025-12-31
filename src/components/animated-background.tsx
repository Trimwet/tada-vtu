"use client";

import { useEffect, useRef } from "react";

interface Shape {
  x: number;
  y: number;
  z: number; // 3D depth (0 = far, 1 = close)
  size: number;
  baseSize: number;
  speedX: number;
  speedY: number;
  speedZ: number; // Movement in depth
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  type: "circle" | "square" | "triangle" | "hexagon" | "ring";
  color: string;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef<Shape[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
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

    // Colors - green theme
    const colors = [
      "rgba(34, 197, 94, 0.15)",  // green-500
      "rgba(16, 185, 129, 0.12)", // emerald-500
      "rgba(52, 211, 153, 0.1)",  // emerald-400
      "rgba(74, 222, 128, 0.08)", // green-400
      "rgba(134, 239, 172, 0.06)", // green-300
    ];

    // Initialize shapes with 3D depth
    const initShapes = () => {
      const getShapeCount = () => {
        const pixelCount = canvas.width * canvas.height;
        // Reduce count significantly for mobile devices
        if (window.innerWidth < 768) {
          return Math.floor(pixelCount / 80000); // Very few shapes on mobile
        }
        return Math.floor(pixelCount / 40000);
      };

      const shapes: Shape[] = [];
      const shapeCount = getShapeCount();

      for (let i = 0; i < Math.min(shapeCount, window.innerWidth < 768 ? 10 : 30); i++) {
        const z = Math.random(); // 0 = far background, 1 = close foreground
        const baseSize = Math.random() * 50 + 15;
        shapes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z,
          baseSize,
          size: baseSize * (0.3 + z * 0.7), // Far shapes smaller, close shapes bigger
          speedX: (Math.random() - 0.5) * 0.2 * (0.3 + z * 0.7), // Far shapes move slower
          speedY: (Math.random() - 0.5) * 0.2 * (0.3 + z * 0.7),
          speedZ: (Math.random() - 0.5) * 0.003, // Slow depth movement
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.003 * (0.5 + z * 0.5),
          opacity: (Math.random() * 0.3 + 0.05) * (0.4 + z * 0.6), // Far shapes more transparent
          type: ["circle", "square", "triangle", "hexagon", "ring"][
            Math.floor(Math.random() * 5)
          ] as Shape["type"],
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      // Sort by depth so far shapes render first (behind)
      shapes.sort((a, b) => a.z - b.z);
      shapesRef.current = shapes;
    };
    initShapes();

    // Draw functions
    const drawCircle = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.size / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawSquare = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.rotation);
      ctx.fillRect(-shape.size / 2, -shape.size / 2, shape.size, shape.size);
      ctx.restore();
    };

    const drawTriangle = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.rotation);
      ctx.beginPath();
      ctx.moveTo(0, -shape.size / 2);
      ctx.lineTo(shape.size / 2, shape.size / 2);
      ctx.lineTo(-shape.size / 2, shape.size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawHexagon = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.rotation);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = (shape.size / 2) * Math.cos(angle);
        const y = (shape.size / 2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawRing = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.size / 2, 0, Math.PI * 2);
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };


    // Animation loop with 3D depth
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sort by depth each frame for proper layering
      shapesRef.current.sort((a, b) => a.z - b.z);

      shapesRef.current.forEach((shape) => {
        // Update position
        shape.x += shape.speedX;
        shape.y += shape.speedY;
        shape.rotation += shape.rotationSpeed;

        // Update depth (z) with oscillation for floating 3D effect
        shape.z += shape.speedZ;
        if (shape.z > 1) {
          shape.z = 1;
          shape.speedZ *= -1;
        } else if (shape.z < 0) {
          shape.z = 0;
          shape.speedZ *= -1;
        }

        // Update size and opacity based on depth (parallax effect)
        shape.size = shape.baseSize * (0.3 + shape.z * 0.7);
        shape.opacity = (0.05 + shape.z * 0.15);

        // Wrap around edges
        if (shape.x < -shape.size) shape.x = canvas.width + shape.size;
        if (shape.x > canvas.width + shape.size) shape.x = -shape.size;
        if (shape.y < -shape.size) shape.y = canvas.height + shape.size;
        if (shape.y > canvas.height + shape.size) shape.y = -shape.size;

        // Apply depth-based blur effect via shadow
        const blurAmount = (1 - shape.z) * 8; // Far = more blur
        ctx.shadowBlur = blurAmount;
        ctx.shadowColor = shape.color;

        // Draw shape with depth-adjusted color
        const depthAlpha = 0.4 + shape.z * 0.6;
        ctx.fillStyle = shape.color.replace(/[\d.]+\)$/, `${shape.opacity * depthAlpha})`);

        switch (shape.type) {
          case "circle":
            drawCircle(ctx, shape);
            break;
          case "square":
            drawSquare(ctx, shape);
            break;
          case "triangle":
            drawTriangle(ctx, shape);
            break;
          case "hexagon":
            drawHexagon(ctx, shape);
            break;
          case "ring":
            drawRing(ctx, shape);
            break;
        }

        ctx.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}

// Floating particles version - lighter weight
export function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    speedY: number;
    opacity: number;
    pulse: number;
    pulseSpeed: number;
  }>>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      const particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 30000);

      for (let i = 0; i < Math.min(count, 40); i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 4 + 1,
          speedY: Math.random() * 0.5 + 0.1,
          opacity: Math.random() * 0.5 + 0.2,
          pulse: 0,
          pulseSpeed: Math.random() * 0.02 + 0.01,
        });
      }
      particlesRef.current = particles;
    };
    initParticles();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        // Float upward
        p.y -= p.speedY;
        p.pulse += p.pulseSpeed;

        // Reset when off screen
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        // Pulsing opacity
        const currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));

        // Draw glowing particle
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, `rgba(34, 197, 94, ${currentOpacity})`);
        gradient.addColorStop(1, "rgba(34, 197, 94, 0)");

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
