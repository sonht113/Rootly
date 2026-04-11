"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  const publicEnv = getPublicEnv();
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
