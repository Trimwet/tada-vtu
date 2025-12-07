"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import { LogoutDialog } from "@/components/logout-dialog";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase/client";

export default function ProfilePage() {
  const { user, loading, refreshUser } = useSupabaseUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
  });
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.full_name || "",
        phoneNumber: user.phone_number || "",
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load profile</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!formData.fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!user?.id) {
      toast.error("User not found. Please refresh the page.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName.trim(),
          phone_number: formData.phoneNumber.trim() || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", user.id);

      if (error) {
        console.error("Supabase error:", error);
        toast.error(error.message || "Failed to update profile");
        return;
      }

      await refreshUser();
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user.full_name || "",
      phoneNumber: user.phone_number || "",
    });
    setIsEditing(false);
  };

  const menuItems = [
    {
      name: "Transaction History",
      icon: "receipt-outline",
      href: "/dashboard/transactions",
    },
    {
      name: "Beneficiaries",
      icon: "people-outline",
      href: "/dashboard/beneficiaries",
    },
    { name: "Referrals", icon: "gift-outline", href: "/dashboard/referrals" },
    {
      name: "Security",
      icon: "shield-checkmark-outline",
      href: "/dashboard/settings",
    },
    {
      name: "Help & Support",
      icon: "help-circle-outline",
      href: "/dashboard/support",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
              >
                <IonIcon name="arrow-back-outline" size="20px" />
              </Link>
              <h1 className="text-lg font-semibold text-foreground">Profile</h1>
            </div>
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <IonIcon name="settings-outline" size="20px" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 space-y-6 max-w-2xl">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <span className="text-green-600 font-bold text-3xl">
              {(user.full_name || "U")
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {user.full_name || "User"}
            </h2>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
            <IonIcon name="checkmark-circle" size="16px" color="#16a34a" />
            <span className="text-green-600 text-sm font-medium">
              Verified Account
            </span>
          </div>
        </div>

        {/* Personal Information */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Personal Information
                </CardTitle>
                <CardDescription className="text-sm">
                  Manage your account details
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700"
                onClick={() =>
                  isEditing ? handleCancel() : setIsEditing(true)
                }
              >
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="fullName"
                className="text-muted-foreground text-sm"
              >
                Full Name
              </Label>
              {isEditing ? (
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="bg-background border-border"
                />
              ) : (
                <p className="text-foreground font-medium">
                  {user.full_name || "-"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-sm">
                Email Address
              </Label>
              <p className="text-foreground font-medium">{user.email || "-"}</p>
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-muted-foreground text-sm">
                Phone Number
              </Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08012345678"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  className="bg-background border-border"
                />
              ) : (
                <p className="text-foreground font-medium">
                  {user.phone_number || "-"}
                </p>
              )}
            </div>
            {isEditing && (
              <Button
                onClick={handleSave}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Referral Code
              </span>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-mono font-medium">
                  {user.referral_code || "-"}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <IonIcon name="copy-outline" size="16px" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Member Since
              </span>
              <span className="text-foreground font-medium">
                {new Date(user.created_at).toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Account Status
              </span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <IonIcon name={item.icon} size="18px" color="#16a34a" />
                    </div>
                    <span className="text-foreground font-medium">
                      {item.name}
                    </span>
                  </div>
                  <IonIcon
                    name="chevron-forward-outline"
                    size="18px"
                    className="text-muted-foreground"
                  />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-500"
          onClick={() => setShowLogoutDialog(true)}
        >
          <IonIcon name="log-out-outline" size="18px" className="mr-2" />
          Log Out
        </Button>

        <p className="text-center text-muted-foreground text-xs">
          TADA VTU v1.0.0
        </p>
      </main>

      {/* Logout Confirmation Dialog */}
      <LogoutDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
      />
    </div>
  );
}
