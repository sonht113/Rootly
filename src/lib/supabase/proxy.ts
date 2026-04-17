import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getCanonicalPathForRole, getRoleHomePath } from "@/lib/navigation/role-routes";
import { getPublicEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  const publicEnv = getPublicEnv();
  const cookiesToApply: Array<{
    name: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
    value: string;
  }> = [];

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
            cookiesToApply.push({ name, value, options });
          });
        },
      },
    },
  );

  function finalizeResponse(response: NextResponse) {
    cookiesToApply.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user || pathname.startsWith("/api/")) {
    return finalizeResponse(NextResponse.next());
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return finalizeResponse(NextResponse.next());
  }

  const nextPathname =
    pathname === "/login" || pathname === "/register"
      ? getRoleHomePath(profile.role)
      : getCanonicalPathForRole(profile.role, pathname);

  if (!nextPathname || nextPathname === pathname) {
    return finalizeResponse(NextResponse.next());
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = nextPathname;

  return finalizeResponse(NextResponse.redirect(redirectUrl));
}
