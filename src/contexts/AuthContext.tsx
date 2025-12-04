'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string, phoneNumber: string) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
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

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      if (data) {
        setProfile(data);
      }
      return data;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  }, [supabase]);


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, newSession: Session | null) => {
        try {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            await fetchProfile(newSession.user.id);
          } else {
            setProfile(null);
          }
          
          // Handle sign out event
          if (event === 'SIGNED_OUT') {
            setProfile(null);
          }
        } catch (err) {
          console.error('Auth state change error:', err);
        } finally {
          setLoading(false);
        }
      }
    );

    // Initial session check
    const initSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error.message);
          // Clear any stale session data
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (err) {
        console.error('Error initializing session:', err);
        // Clear state on error
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    initSession();

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string, phoneNumber: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    if (data.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any)
        .update({ phone_number: phoneNumber, full_name: fullName })
        .eq('id', data.user.id);
    }
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    // Always clear local state
    setSession(null);
    setUser(null);
    setProfile(null);
    
    // Clear any stale Supabase data from localStorage
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      isAuthenticated: !!session,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
