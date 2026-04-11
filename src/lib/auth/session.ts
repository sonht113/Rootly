import { cache } from "react";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole, ProfileRow } from "@/types/domain";

export class MissingProfileError extends Error {
  constructor(userId: string) {
    super(
      `Đăng nhập thành công nhưng chưa tìm thấy hồ sơ người dùng cho tài khoản ${userId}. ` +
        "Hãy chạy migration backfill profiles để đồng bộ dữ liệu từ auth.users sang public.profiles.",
    );
    this.name = "MissingProfileError";
  }
}

export const getCurrentSession = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentSession();
  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Không thể tải hồ sơ người dùng: ${error.message}`);
  }

  if (!data) {
    throw new MissingProfileError(user.id);
  }

  return data as ProfileRow;
});

export async function requireAuth() {
  const user = await getCurrentSession();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(roles: AppRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  if (!roles.includes(profile.role)) {
    redirect("/today");
  }

  return profile;
}
