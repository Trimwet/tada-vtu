"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { LogoutDialog } from "@/components/logout-dialog";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
    promotions: true,
  });

  const [preferences, setPreferences] = useState({
    darkMode: true,
    biometric: false,
    autoLogout: true,
  });

  const Toggle = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: () => void;
  }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
        enabled ? "bg-green-500" : "bg-zinc-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-smooth lg:hidden"
            >
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">
              Settings
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 space-y-6 max-w-2xl">
        {/* KYC Verification Status */}
        <Card className="border-border overflow-hidden">
          <div
            onClick={() =>
              toast.info("Identity Verification", {
                description: "This feature is coming soon!",
              })
            }
            className="cursor-pointer"
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <IonIcon
                      name="shield-checkmark"
                      size="20px"
                      color="white"
                    />
                  </div>
                  <div>
                    <p className="text-green-100 text-xs">
                      Verification Status
                    </p>
                    <h3 className="text-white font-semibold">
                      Tier 1 Verified
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <span className="text-sm">Upgrade</span>
                  <IonIcon name="chevron-forward" size="18px" />
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Daily Limit</span>
                <span className="font-medium text-foreground">₦50,000</span>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Security */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <IonIcon
                name="shield-checkmark-outline"
                size="20px"
                color="#22c55e"
              />
              Security
            </CardTitle>
            <CardDescription className="text-sm">
              Protect your account
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <Link
                href="/dashboard/settings/change-pin"
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-smooth cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <IonIcon
                      name="keypad-outline"
                      size="18px"
                      color="#22c55e"
                    />
                  </div>
                  <div>
                    <span className="text-foreground font-medium">
                      Transaction PIN
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Set or change your PIN
                    </p>
                  </div>
                </div>
                <IonIcon
                  name="chevron-forward-outline"
                  size="18px"
                  className="text-muted-foreground"
                />
              </Link>
              <Link
                href="/dashboard/settings/reset-pin"
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-smooth cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <IonIcon
                      name="refresh-outline"
                      size="18px"
                      color="#f97316"
                    />
                  </div>
                  <div>
                    <span className="text-foreground font-medium">
                      Reset PIN
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Forgot your PIN? Reset via email
                    </p>
                  </div>
                </div>
                <IonIcon
                  name="chevron-forward-outline"
                  size="18px"
                  className="text-muted-foreground"
                />
              </Link>
              <Link
                href="/dashboard/settings/change-password"
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-smooth cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <IonIcon
                      name="lock-closed-outline"
                      size="18px"
                      color="#22c55e"
                    />
                  </div>
                  <div>
                    <span className="text-foreground font-medium">
                      Change Password
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Update your password
                    </p>
                  </div>
                </div>
                <IonIcon
                  name="chevron-forward-outline"
                  size="18px"
                  className="text-muted-foreground"
                />
              </Link>
              <Link
                href="/dashboard/settings/change-pin"
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-smooth cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <IonIcon
                      name="keypad-outline"
                      size="18px"
                      color="#f97316"
                    />
                  </div>
                  <div>
                    <span className="text-foreground font-medium">
                      Change PIN
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Update your transaction PIN
                    </p>
                  </div>
                </div>
                <IonIcon
                  name="chevron-forward-outline"
                  size="18px"
                  className="text-muted-foreground"
                />
              </Link>
              <div
                onClick={() =>
                  toast.info("Identity Verification", {
                    description: "This feature is coming soon!",
                  })
                }
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-smooth cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <IonIcon
                      name="person-circle-outline"
                      size="18px"
                      color="#22c55e"
                    />
                  </div>
                  <div>
                    <span className="text-foreground font-medium">
                      KYC Verification
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Verify your identity
                    </p>
                  </div>
                </div>
                <IonIcon
                  name="chevron-forward-outline"
                  size="18px"
                  className="text-muted-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <IonIcon
                name="notifications-outline"
                size="20px"
                color="#22c55e"
              />
              Notifications
            </CardTitle>
            <CardDescription className="text-sm">
              Manage how you receive alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">
                  Push Notifications
                </p>
                <p className="text-muted-foreground text-sm">
                  Receive alerts on your device
                </p>
              </div>
              <Toggle
                enabled={notifications.push}
                onChange={() =>
                  setNotifications({
                    ...notifications,
                    push: !notifications.push,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">
                  Email Notifications
                </p>
                <p className="text-muted-foreground text-sm">
                  Get updates via email
                </p>
              </div>
              <Toggle
                enabled={notifications.email}
                onChange={() =>
                  setNotifications({
                    ...notifications,
                    email: !notifications.email,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">SMS Notifications</p>
                <p className="text-muted-foreground text-sm">
                  Receive text messages
                </p>
              </div>
              <Toggle
                enabled={notifications.sms}
                onChange={() =>
                  setNotifications({
                    ...notifications,
                    sms: !notifications.sms,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">
                  Promotional Messages
                </p>
                <p className="text-muted-foreground text-sm">
                  Offers and discounts
                </p>
              </div>
              <Toggle
                enabled={notifications.promotions}
                onChange={() =>
                  setNotifications({
                    ...notifications,
                    promotions: !notifications.promotions,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <IonIcon name="options-outline" size="20px" color="#22c55e" />
              App Preferences
            </CardTitle>
            <CardDescription className="text-sm">
              Customize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Dark Mode</p>
                <p className="text-muted-foreground text-sm">Use dark theme</p>
              </div>
              <Toggle
                enabled={preferences.darkMode}
                onChange={() =>
                  setPreferences({
                    ...preferences,
                    darkMode: !preferences.darkMode,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Biometric Login</p>
                <p className="text-muted-foreground text-sm">
                  Use fingerprint or face ID
                </p>
              </div>
              <Toggle
                enabled={preferences.biometric}
                onChange={() =>
                  setPreferences({
                    ...preferences,
                    biometric: !preferences.biometric,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Auto Logout</p>
                <p className="text-muted-foreground text-sm">
                  Log out after 15 minutes of inactivity
                </p>
              </div>
              <Toggle
                enabled={preferences.autoLogout}
                onChange={() =>
                  setPreferences({
                    ...preferences,
                    autoLogout: !preferences.autoLogout,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Support & Legal */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <IonIcon name="help-circle-outline" size="20px" color="#22c55e" />
              Support & Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <Link
                href="/dashboard/support"
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-smooth"
              >
                <div className="flex items-center gap-3">
                  <IonIcon
                    name="chatbubble-ellipses-outline"
                    size="20px"
                    className="text-muted-foreground"
                  />
                  <span className="text-foreground">Help & Support</span>
                </div>
                <IonIcon
                  name="chevron-forward-outline"
                  size="18px"
                  className="text-muted-foreground"
                />
              </Link>
              <Link
                href="/terms"
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-smooth"
              >
                <div className="flex items-center gap-3">
                  <IonIcon
                    name="document-text-outline"
                    size="20px"
                    className="text-muted-foreground"
                  />
                  <span className="text-foreground">Terms of Service</span>
                </div>
                <IonIcon
                  name="chevron-forward-outline"
                  size="18px"
                  className="text-muted-foreground"
                />
              </Link>
              <Link
                href="/privacy"
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-smooth"
              >
                <div className="flex items-center gap-3">
                  <IonIcon
                    name="eye-outline"
                    size="20px"
                    className="text-muted-foreground"
                  />
                  <span className="text-foreground">Privacy Policy</span>
                </div>
                <IonIcon
                  name="chevron-forward-outline"
                  size="18px"
                  className="text-muted-foreground"
                />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-500 flex items-center gap-2">
              <IonIcon name="warning-outline" size="20px" color="#ef4444" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LogoutDialog
              trigger={
                <Button
                  variant="outline"
                  className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                >
                  <IonIcon name="log-out-outline" size="18px" className="mr-2" />
                  Log Out
                </Button>
              }
            />
            <Button
              variant="outline"
              className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              onClick={() => toast.info("Account deletion is not available yet")}
            >
              <IonIcon name="trash-outline" size="18px" className="mr-2" />
              Delete Account
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground text-xs pb-4">
          TADA VTU v1.0.0
        </p>
      </main>
    </div>
  );
}
