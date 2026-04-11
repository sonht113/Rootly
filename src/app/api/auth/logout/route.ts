import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/supabase/env";

export async function POST() {
  const publicEnv = getPublicEnv();
  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}
