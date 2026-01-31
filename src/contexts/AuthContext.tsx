"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string,
    referralCode?: string
  ) => Promise<{ user: User | null }>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabase();

  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      if (!userId) {
        console.warn("fetchProfile called without userId");
        return null;
      }

      try {
        // Check if user is authenticated first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || session.user.id !== userId) {
          console.warn("User not authenticated or userId mismatch");
          return null;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, phone_number, email, balance, referral_code, kyc_level, loyalty_points, loyalty_tier, total_points_earned, login_streak, longest_streak, spin_available, birthday, total_spent, pin, created_at")
          .eq("id", userId)
          .single();

        if (error) {
          // Only log actual errors, not empty objects
          if (error.message) {
            console.error("Profile fetch error:", {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
          }
          return null;
        }

        const profileData = data as Profile;
        setProfile(profileData);
        return profileData;
      } catch (err) {
        console.error("Profile fetch exception:", err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        fetchProfile(newSession.user.id);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);


  // Password-based signup - simple and reliable
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string,
    referralCode?: string
  ) => {
    // Find referrer if code provided
    let referrerId: string | null = null;
    if (referralCode) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode.toUpperCase())
        .single();

      if (referrer && typeof referrer === "object" && "id" in referrer) {
        referrerId = (referrer as { id: string }).id;
      }
    }

    // Create user with auto-confirm (no email verification needed)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;

    // Update profile with phone and referrer (with retry for trigger delay)
    if (data.user) {
      const updateData: Record<string, unknown> = {
        phone_number: phoneNumber,
        full_name: fullName,
      };
      if (referrerId) updateData.referred_by = referrerId;

      // Wait a bit for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try to update, retry if profile doesn't exist yet
      for (let i = 0; i < 3; i++) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData as never)
          .eq("id", data.user.id);

        if (!updateError) break;

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { user: data.user };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user, profile, session, loading,
        isAuthenticated: !!user,
        signUp, signIn, signInWithGoogle, signOut, refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
