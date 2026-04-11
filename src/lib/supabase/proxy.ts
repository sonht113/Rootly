import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  const publicEnv = getPublicEnv();
  const response = NextResponse.next();

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}
