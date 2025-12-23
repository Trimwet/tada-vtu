"use client";

import { lazy, Suspense } from "react";

// Lazy load the animated background for better performance
const AnimatedBackground = lazy(() => 
  import("@/components/animated-background").then(mod => ({ 
    default: mod.FloatingParticles // Use the lighter version by default
  }))
);

export function AnimatedBackgroundWrapper() {
  return (
    <Suspense fallback={null}>
      <AnimatedBackground />
    </Suspense>
  );
}
