import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/domain";

import { unwrapSupabaseError } from "@/server/repositories/shared";

async function getAuthenticatedProfileContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    unwrapSupabaseError(authError, "Không thể xác thực người dùng hiện tại");
  }

  if (!user) {
    throw new Error("Bạn cần đăng nhập để cập nhật hồ sơ.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    unwrapSupabaseError(profileError, "Không thể tải hồ sơ người dùng hiện tại");
  }

  return {
    supabase,
    user,
    profile: profile as ProfileRow,
  };
}

export async function getCurrentProfileForSettings() {
  const { profile } = await getAuthenticatedProfileContext();

  return profile;
}

export async function updateCurrentProfileRecord(
  values: Partial<Pick<ProfileRow, "email" | "avatar_url">>,
) {
  const { supabase, user } = await getAuthenticatedProfileContext();
  const { data, error } = await supabase
    .from("profiles")
    .update(values)
    .eq("auth_user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    unwrapSupabaseError(error, "Không thể cập nhật hồ sơ người dùng");
  }

  return data as ProfileRow;
}
