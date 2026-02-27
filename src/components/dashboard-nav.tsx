"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IonIcon } from "@/components/ion-icon";
import { LogoInline } from "@/components/logo";
import { LogoutDialog } from "@/components/logout-dialog";
import { cn } from "@/lib/utils";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useState } from "react";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: "grid-outline", exact: true },
  { name: "Buy Airtime", href: "/dashboard/buy-airtime", icon: "call-outline" },
  { name: "Buy Data", href: "/dashboard/buy-data", icon: "wifi-outline" },
  { name: "Data Vault", href: "/dashboard/data-vault", icon: "archive-outline" },
  { name: "Transactions", href: "/dashboard/transactions", icon: "receipt-outline" },
];

const secondaryItems = [
  { name: "Referrals", href: "/dashboard/referrals", icon: "people-outline" },
  { name: "Profile", href: "/dashboard/profile", icon: "person-outline" },
  { name: "Settings", href: "/dashboard/settings", icon: "settings-outline" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useSupabaseUser();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={cn(
      "hidden lg:flex flex-col h-screen fixed left-0 top-0 bg-background border-r border-border z-40 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <LogoInline size="sm" />
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-muted rounded-lg transition-colors ml-auto"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IonIcon 
            name={isCollapsed ? "chevron-forward-outline" : "chevron-back-outline"} 
            size="18px" 
            className="text-muted-foreground"
          />
        </button>
      </div>

      {/* User Info */}
      {!isCollapsed && user && (
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold text-sm">
              {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                ₦{(user.balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group relative",
                  isActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <IonIcon
                  name={item.icon}
                  size="18px"
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!isCollapsed && (
                  <span className="text-sm truncate">{item.name}</span>
                )}
                {isActive && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-border" />

        {/* Secondary Items */}
        <div className="space-y-1">
          {secondaryItems.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group relative",
                  isActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <IonIcon
                  name={item.icon}
                  size="18px"
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!isCollapsed && (
                  <span className="text-sm truncate">{item.name}</span>
                )}
                {isActive && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Support Link */}
        {!isCollapsed && (
          <Link
            href="https://wa.me/2349076721885"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
          >
            <IonIcon name="help-circle-outline" size="18px" />
            <span>Help & Support</span>
          </Link>
        )}

        {/* Logout */}
        <LogoutDialog
          trigger={
            <button 
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? "Logout" : undefined}
            >
              <IonIcon name="log-out-outline" size="18px" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          }
        />
      </div>
    </aside>
  );
}

export function DashboardBottomNav() {
  const pathname = usePathname();

  const mobileNavItems = [
    { name: "Home", href: "/dashboard", icon: "grid-outline", exact: true },
    { name: "Airtime", href: "/dashboard/buy-airtime", icon: "call-outline" },
    { name: "Data", href: "/dashboard/buy-data", icon: "wifi-outline" },
    { name: "Vault", href: "/dashboard/data-vault", icon: "archive-outline" },
    { name: "More", href: "/dashboard/profile", icon: "person-outline" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border lg:hidden z-50 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                isActive && "bg-muted"
              )}>
                <IonIcon
                  name={item.icon}
                  size="20px"
                />
              </div>
              <span className={cn(
                "text-[10px]",
                isActive ? "font-semibold" : "font-medium"
              )}>{item.name}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
