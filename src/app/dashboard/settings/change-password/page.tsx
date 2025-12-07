'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const handleNewPasswordChange = (value: string) => {
    setFormData({ ...formData, newPassword: value });
    setPasswordStrength(checkPasswordStrength(value));
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return { label: '', color: '' };
    if (passwordStrength <= 2) return { label: 'Weak', color: 'text-red-500' };
    if (passwordStrength <= 3) return { label: 'Medium', color: 'text-yellow-500' };
    if (passwordStrength <= 4) return { label: 'Strong', color: 'text-green-500' };
    return { label: 'Very Strong', color: 'text-green-400' };
  };

  const getStrengthBarColor = (index: number) => {
    if (index >= passwordStrength) return 'bg-muted';
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (passwordStrength < 3) {
      toast.error("Please choose a stronger password");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    if (!user?.email) {
      toast.error("User not found. Please login again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // Call API route to change password
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: formData.newPassword,
          accessToken: session.access_token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success("Password changed successfully!", {
        description: "You can now use your new password to login"
      });
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength(0);
    } catch (error) {
      console.error('Password change error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/dashboard/settings" className="p-2 -ml-2 hover:bg-muted rounded-lg transition-smooth">
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2">Change Password</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-md">
        <Card className="border-border">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IonIcon name="lock-closed" size="32px" color="#22c55e" />
            </div>
            <CardTitle className="text-xl">Update Your Password</CardTitle>
            <CardDescription>Choose a strong password to keep your account secure</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="bg-background border-border pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    <IonIcon name={showPasswords.current ? 'eye-off-outline' : 'eye-outline'} size="18px" />
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={formData.newPassword}
                    onChange={(e) => handleNewPasswordChange(e.target.value)}
                    className="bg-background border-border pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    <IonIcon name={showPasswords.new ? 'eye-off-outline' : 'eye-outline'} size="18px" />
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.newPassword && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-colors ${getStrengthBarColor(index)}`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${getStrengthLabel().color}`}>
                      {getStrengthLabel().label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="bg-background border-border pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    <IonIcon name={showPasswords.confirm ? 'eye-off-outline' : 'eye-outline'} size="18px" />
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <IonIcon name="checkmark-circle" size="14px" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-12 transition-smooth"
                disabled={isSubmitting || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating Password...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IonIcon name="checkmark-circle-outline" size="20px" />
                    Change Password
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>


        {/* Password Requirements */}
        <Card className="border-border mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IonIcon name="shield-checkmark-outline" size="18px" color="#22c55e" />
              Password Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-sm space-y-2">
              <li className={`flex items-center gap-2 ${formData.newPassword.length >= 8 ? 'text-green-500' : 'text-muted-foreground'}`}>
                <IonIcon 
                  name={formData.newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'} 
                  size="16px" 
                />
                <span>At least 8 characters</span>
              </li>
              <li className={`flex items-center gap-2 ${formData.newPassword.match(/[a-z]/) ? 'text-green-500' : 'text-muted-foreground'}`}>
                <IonIcon 
                  name={formData.newPassword.match(/[a-z]/) ? 'checkmark-circle' : 'ellipse-outline'} 
                  size="16px" 
                />
                <span>One lowercase letter</span>
              </li>
              <li className={`flex items-center gap-2 ${formData.newPassword.match(/[A-Z]/) ? 'text-green-500' : 'text-muted-foreground'}`}>
                <IonIcon 
                  name={formData.newPassword.match(/[A-Z]/) ? 'checkmark-circle' : 'ellipse-outline'} 
                  size="16px" 
                />
                <span>One uppercase letter</span>
              </li>
              <li className={`flex items-center gap-2 ${formData.newPassword.match(/[0-9]/) ? 'text-green-500' : 'text-muted-foreground'}`}>
                <IonIcon 
                  name={formData.newPassword.match(/[0-9]/) ? 'checkmark-circle' : 'ellipse-outline'} 
                  size="16px" 
                />
                <span>One number</span>
              </li>
              <li className={`flex items-center gap-2 ${formData.newPassword.match(/[^a-zA-Z0-9]/) ? 'text-green-500' : 'text-muted-foreground'}`}>
                <IonIcon 
                  name={formData.newPassword.match(/[^a-zA-Z0-9]/) ? 'checkmark-circle' : 'ellipse-outline'} 
                  size="16px" 
                />
                <span>One special character (!@#$%^&*)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Forgot Password Link */}
        <div className="text-center mt-6">
          <Link 
            href="/forgot-password"
            className="text-sm text-green-500 hover:text-green-400 font-medium transition-smooth"
          >
            Forgot your current password?
          </Link>
        </div>
      </main>
    </div>
  );
}
