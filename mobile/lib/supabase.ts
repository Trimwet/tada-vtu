import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ── Environment ───────────────────────────────────────────────────────────────
// Expo embeds EXPO_PUBLIC_ vars at build time. The monorepo root .env.local
// uses NEXT_PUBLIC_ names, so we fall back to those for local dev.
const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

// ── Storage adapter ───────────────────────────────────────────────────────────
// expo-secure-store is native-only; on web we fall back to localStorage so the
// app works in a browser (dev / web preview) without crashing.
const sanitize = (key: string) => key.replace(/[^a-zA-Z0-9_-]/g, '_');

const secureStoreAdapter = {
  getItem(key: string): string | null | Promise<string | null> {
    return SecureStore.getItemAsync(sanitize(key));
  },
  setItem(key: string, value: string): void | Promise<void> {
    return SecureStore.setItemAsync(sanitize(key), value);
  },
  removeItem(key: string): void | Promise<void> {
    return SecureStore.deleteItemAsync(sanitize(key));
  },
};

const localStorageAdapter = {
  getItem(key: string): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(sanitize(key)) : null;
  },
  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(sanitize(key), value);
  },
  removeItem(key: string): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(sanitize(key));
  },
};

const storageAdapter = Platform.OS === 'web' ? localStorageAdapter : secureStoreAdapter;

// ── Supabase client ───────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
