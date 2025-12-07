"use client";

import { WhatsAppButton } from "@/components/whatsapp-button";
import { AuthGuard } from "@/components/auth-guard";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import {
  DashboardSidebar,
  DashboardBottomNav,
} from "@/components/dashboard-nav";

function DashboardContent({ children }: { children: React.ReactNode }) {
  // Enable real-time notifications for logged-in users
  useRealtimeNotifications();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile via CSS in component */}
      <DashboardSidebar />

      {/* Main Content Area */}
      {/* lg:pl-64 offsets content for the 64 (16rem) sidebar width */}
      {/* pb-20 ensures content isn't hidden behind mobile bottom nav */}
      <main className="lg:pl-64 min-h-screen pb-20 lg:pb-8 transition-all duration-200">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Hidden on desktop via CSS in component */}
      <DashboardBottomNav />

      {/* Floating WhatsApp Button */}
      <WhatsAppButton />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAuth={true}>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  );
}
