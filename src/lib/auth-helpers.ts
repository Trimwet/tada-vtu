import { getSupabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

const AUTH_CACHE_KEY = 'tada_auth_cache';
const PROFILE_CACHE_KEY = 'tada_profile_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const PROFILE_CACHE_EXPIRY_MS = 30 * 1000; // 30 seconds for profile (balance updates more frequently)

interface AuthCache {
  user: User | null;
  session: Session | null;
  timestamp: number;
}

interface ProfileCache {
  profile: Profile | null;
  timestamp: number;
}

/**
 * Quick auth check using sessionStorage cache
 * Returns immediately without waiting for network calls
 */
export function getQuickAuthState(): { user: User | null; session: Session | null; isValid: boolean } {
  if (typeof window === 'undefined') {
    return { user: null, session: null, isValid: false };
  }

  try {
    const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) {
      return { user: null, session: null, isValid: false };
    }

    const authCache: AuthCache = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - authCache.timestamp > CACHE_EXPIRY_MS) {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      return { user: null, session: null, isValid: false };
    }

    // Check if session is expired
    if (authCache.session?.expires_at) {
      const expiresAt = authCache.session.expires_at * 1000;
      if (now >= expiresAt) {
        sessionStorage.removeItem(AUTH_CACHE_KEY);
        return { user: null, session: null, isValid: false };
      }
    }

    return {
      user: authCache.user,
      session: authCache.session,
      isValid: true,
    };
  } catch (error) {
    console.error('Error reading auth cache:', error);
    return { user: null, session: null, isValid: false };
  }
}

/**
 * Update the auth cache
 */
export function updateAuthCache(user: User | null, session: Session | null) {
  if (typeof window === 'undefined') return;

  try {
    if (user && session) {
      const authCache: AuthCache = {
        user,
        session,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(authCache));
    } else {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch (error) {
    console.error('Error updating auth cache:', error);
  }
}

/**
 * Clear the auth cache
 */
export function clearAuthCache() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUTH_CACHE_KEY);
  sessionStorage.removeItem(PROFILE_CACHE_KEY);
}

/**
 * Get cached profile for instant balance display
 */
export function getCachedProfile(): Profile | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;

    const profileCache: ProfileCache = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - profileCache.timestamp > PROFILE_CACHE_EXPIRY_MS) {
      return profileCache.profile; // Return stale data, will be refreshed in background
    }

    return profileCache.profile;
  } catch (error) {
    console.error('Error reading profile cache:', error);
    return null;
  }
}

/**
 * Update the profile cache
 */
export function updateProfileCache(profile: Profile | null) {
  if (typeof window === 'undefined') return;

  try {
    if (profile) {
      const profileCache: ProfileCache = {
        profile,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profileCache));
    } else {
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch (error) {
    console.error('Error updating profile cache:', error);
  }
}

/**
 * Fast auth check that uses cache first, then validates with Supabase
 */
export async function fastAuthCheck(): Promise<{ user: User | null; session: Session | null }> {
  // First, try to get from cache
  const cached = getQuickAuthState();
  if (cached.isValid && cached.user && cached.session) {
    // Return cached data immediately
    // Validate in background (don't wait)
    validateAuthInBackground();
    return { user: cached.user, session: cached.session };
  }

  // No valid cache, check with Supabase
  const supabase = getSupabase();
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      clearAuthCache();
      return { user: null, session: null };
    }

    // Update cache with fresh data
    updateAuthCache(session.user, session);
    return { user: session.user, session };
  } catch (error) {
    console.error('Error checking auth:', error);
    clearAuthCache();
    return { user: null, session: null };
  }
}

/**
 * Validate cached auth in background
 */
async function validateAuthInBackground() {
  const supabase = getSupabase();

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      clearAuthCache();
    } else {
      // Update cache with fresh data
      updateAuthCache(session.user, session);
    }
  } catch (error) {
    console.error('Background auth validation error:', error);
  }
}

/**
 * Initialize auth state on app load
 */
export async function initializeAuth(): Promise<{ user: User | null; session: Session | null; loading: boolean }> {
  // Check cache first for instant response
  const cached = getQuickAuthState();
  if (cached.isValid && cached.user && cached.session) {
    // Start background validation
    validateAuthInBackground();
    return { user: cached.user, session: cached.session, loading: false };
  }

  // No cache, get from Supabase
  const supabase = getSupabase();
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      clearAuthCache();
      return { user: null, session: null, loading: false };
    }

    updateAuthCache(session.user, session);
    return { user: session.user, session, loading: false };
  } catch (error) {
    console.error('Auth initialization error:', error);
    clearAuthCache();
    return { user: null, session: null, loading: false };
  }
}
