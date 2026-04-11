import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/domain";

export async function findProfileByUsername(username: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .maybeSingle();

  return (data ?? null) as ProfileRow | null;
}

export async function getProfileByAuthUserId(authUserId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  return data as ProfileRow;
}

