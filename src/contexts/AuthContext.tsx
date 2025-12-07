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
import {
  getQuickAuthState,
  updateAuthCache,
  clearAuthCache,
  fastAuthCheck,
  getCachedProfile,
  updateProfileCache,
} from "@/lib/auth-helpers";

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
    referralCode?: string,
  ) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Try to get cached auth state immediately
  const cachedAuth = getQuickAuthState();
  const cachedProfile = getCachedProfile();
  const [user, setUser] = useState<User | null>(cachedAuth.user);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [session, setSession] = useState<Session | null>(cachedAuth.session);
  const [loading, setLoading] = useState(!cachedAuth.isValid);

  const supabase = getSupabase();

  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Profile fetch error:", error);
          // Create a basic profile for new users
          if (error.code === "PGRST116") {
            const newProfile: Profile = {
              id: userId,
              email: null,
              full_name: null,
              phone_number: null,
              balance: 0,
              referral_code: null,
              referred_by: null,
              pin: null,
              kyc_level: 0,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setProfile(newProfile);
            updateProfileCache(newProfile);
            return newProfile;
          }
          return null;
        }

        const profileData = data as Profile;
        setProfile(profileData);
        updateProfileCache(profileData);
        return profileData;
      } catch (err) {
        console.error("Profile fetch exception:", err);
        return null;
      }
    },
    [supabase],
  );

  // Initialize auth on mount - SUPER FAST with cache
  useEffect(() => {
    let mounted = true;

    // If we already have cached auth, validate in background
    if (cachedAuth.isValid) {
      // Fetch profile immediately if we have a user
      if (cachedAuth.user) {
        fetchProfile(cachedAuth.user.id);
      }

      // Validate session in background (don't block)
      fastAuthCheck().then(({ user: validUser, session: validSession }) => {
        if (!mounted) return;
        if (validUser && validSession) {
          setUser(validUser);
          setSession(validSession);
        } else if (!validUser && cachedAuth.user) {
          // Cache was invalid, clear everything
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
      });
    } else {
      // No cache, do fast auth check
      fastAuthCheck().then(({ user: currentUser, session: currentSession }) => {
        if (!mounted) return;

        if (currentUser && currentSession) {
          console.log("Session found for:", currentUser.email);
          setSession(currentSession);
          setUser(currentUser);

          // Fetch profile
          fetchProfile(currentUser.id);
        } else {
          console.log("No session found");
          setSession(null);
          setUser(null);
          setProfile(null);
          clearAuthCache();
        }

        setLoading(false);
      });
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth event:", event);

      if (!mounted) return;

      switch (event) {
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
          if (newSession?.user) {
            setSession(newSession);
            setUser(newSession.user);
            updateAuthCache(newSession.user, newSession);
            // Don't wait for profile fetch
            fetchProfile(newSession.user.id);
          }
          break;

        case "SIGNED_OUT":
          setSession(null);
          setUser(null);
          setProfile(null);
          break;

        case "USER_UPDATED":
          if (newSession?.user) {
            setUser(newSession.user);
            updateAuthCache(newSession.user, newSession);
            fetchProfile(newSession.user.id);
          }
          break;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, cachedAuth.isValid, cachedAuth.user]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string,
    referralCode?: string,
  ) => {
    // If referral code provided, find the referrer
    let referrerId: string | null = null;
    if (referralCode) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode.toUpperCase())
        .single();
      
      if (referrer && typeof referrer === 'object' && 'id' in referrer) {
        referrerId = (referrer as { id: string }).id;
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) throw error;

    if (data.user) {
      // Update profile with phone number, name, and referrer
      const updateData: Record<string, unknown> = {
        phone_number: phoneNumber,
        full_name: fullName,
      };
      
      if (referrerId) {
        updateData.referred_by = referrerId;
      }

      await supabase
        .from("profiles")
        .update(updateData as never)
        .eq("id", data.user.id);
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      throw error;
    }

    // Update cache immediately for faster subsequent loads
    if (data.session && data.user) {
      updateAuthCache(data.user, data.session);
    }

    // Session will be handled by auth state listener
    return data;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Google sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    // Clear state immediately
    setSession(null);
    setUser(null);
    setProfile(null);
    clearAuthCache(); // This also clears profile cache

    // Then call Supabase signOut (don't wait for it)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("SignOut error:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAuthenticated: !!user,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
