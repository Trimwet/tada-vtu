"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/loading-screen";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = "/login",
}: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip if still loading
    if (loading) return;

    // Check auth requirements
    if (requireAuth && !isAuthenticated) {
      console.log("Not authenticated, redirecting to:", redirectTo);
      router.replace(redirectTo);
    } else if (!requireAuth && isAuthenticated) {
      console.log("Already authenticated, redirecting to dashboard");
      router.replace("/dashboard");
    }
  }, [isAuthenticated, loading, requireAuth, redirectTo, router]);

  // Show loading only during initial auth check
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  // If we need auth but don't have it, show loading while redirecting
  if (requireAuth && !isAuthenticated) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // If we don't need auth but have it, show loading while redirecting
  if (!requireAuth && isAuthenticated) {
    return <LoadingScreen message="Redirecting to dashboard..." />;
  }

  // Auth requirements met, render children
  return <>{children}</>;
}
