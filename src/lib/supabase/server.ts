import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/supabase/env";

export async function createServerSupabaseClient() {
  const publicEnv = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot mutate cookies. The proxy is responsible
            // for refreshing and persisting auth cookies for SSR requests.
          }
        },
      },
    },
  );
}
