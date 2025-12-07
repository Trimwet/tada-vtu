import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "✓ Set"
      : "✗ Missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "✓ Set"
      : "✗ Missing",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "✓ Set"
      : "✗ Missing",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✓ Set" : "✗ Missing",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "✓ Set" : "✗ Missing",
    FLUTTERWAVE_PUBLIC_KEY: process.env.FLUTTERWAVE_PUBLIC_KEY
      ? "✓ Set"
      : "✗ Missing",
    FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY
      ? "✓ Set"
      : "✗ Missing",
    INLOMAX_API_KEY: process.env.INLOMAX_API_KEY ? "✓ Set" : "✗ Missing",
    NODE_ENV: process.env.NODE_ENV,
  };

  // Test Supabase connection
  let supabaseStatus = "✓ Working";
  let supabaseError = "";

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    );

    // Simple test query
    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1)
      .single();

    if (error) {
      supabaseStatus = "✗ Query failed";
      supabaseError = error.message;
    }
  } catch (error) {
    supabaseStatus = "✗ Connection failed";
    supabaseError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    env_variables: env,
    supabase: {
      status: supabaseStatus,
      error: supabaseError,
    },
    message: "Use this endpoint to debug production issues",
  });
}
