"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface LogoutDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LogoutDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: LogoutDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  // Use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      console.log("Starting logout process...");

      // Close the dialog first to provide immediate feedback
      setIsOpen(false);

      // Perform logout
      await signOut();

      // Show success toast
      toast.success("Logged out successfully");

      // Use push instead of replace for better navigation
      // Add a small delay to ensure auth state is cleared
      setTimeout(() => {
        router.push("/login");
      }, 250);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout completely");

      // Even if signOut fails, redirect to login
      // The auth state should be cleared locally
      setTimeout(() => {
        router.push("/login");
      }, 250);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {trigger && <div onClick={() => setIsOpen(true)}>{trigger}</div>}

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Logout
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Are you sure you want to logout?
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
