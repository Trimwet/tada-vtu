import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;

export function createClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isProduction = process.env.NODE_ENV === "production";
  const isBuildTime =
    typeof window === "undefined" &&
    process.env.NEXT_PHASE === "phase-production-build";

  // Return a dummy client during build time if env vars are missing
  // This allows static page generation to work
  if (!url || !key) {
    if (typeof window === "undefined") {
      // During build/SSR without env vars, return a mock-like client
      // This prevents build failures
      if (!isBuildTime) {
        console.warn("Using placeholder Supabase client - env vars not set");
      }
      return createBrowserClient<Database>(
        "https://placeholder.supabase.co",
        "placeholder-key",
      );
    }

    // Client-side production without env vars - throw error
    if (isProduction) {
      throw new Error(
        "Supabase environment variables not configured for production",
      );
    }

    console.error("Missing Supabase environment variables");
    // Return placeholder client for client-side development
    return createBrowserClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-key",
    );
  }

  try {
    // createBrowserClient handles cookies automatically
    const client = createBrowserClient<Database>(url, key);

    // Add error logging in production
    if (isProduction) {
      console.log("Supabase client initialized successfully");
    }

    return client;
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    if (isProduction) {
      throw error;
    }
    // Return placeholder for development
    return createBrowserClient<Database>(
      "https://placeholder.supabase.co",
      "placeholder-key",
    );
  }
}

// Singleton instance for client-side - only create on client
let supabaseInstance: TypedSupabaseClient | null = null;

export function getSupabase(): TypedSupabaseClient {
  if (typeof window === "undefined") {
    // Server-side: always create new instance
    return createClient();
  }

  // Client-side: use singleton
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient();

      // Log successful initialization
      if (process.env.NODE_ENV === "production") {
        console.log("Supabase singleton client initialized");
      }
    } catch (error) {
      console.error("Failed to initialize Supabase singleton:", error);
      throw error;
    }
  }
  return supabaseInstance;
}

// Function to clear singleton (useful for auth logout or testing)
export function clearSupabaseInstance(): void {
  if (typeof window !== "undefined") {
    supabaseInstance = null;
  }
}
