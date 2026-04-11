import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/supabase/env";
import { loginSchema } from "@/lib/validations/auth";
import { resolveLoginIdentifier } from "@/lib/auth/username";

export async function POST(request: Request) {
  const publicEnv = getPublicEnv();
  const payload = loginSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      {
        message: payload.error.issues[0]?.message ?? "Thông tin đăng nhập chưa hợp lệ",
      },
      { status: 400 },
    );
  }

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

  const { error } = await supabase.auth.signInWithPassword({
    email: resolveLoginIdentifier(payload.data.identifier),
    password: payload.data.password,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }

  return response;
}
