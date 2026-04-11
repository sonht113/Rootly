import { createServerSupabaseClient } from "@/lib/supabase/server";

import { unwrapSupabaseError } from "@/server/repositories/shared";

export async function getTeacherClasses() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("classes")
    .select("*, class_members(count)")
    .order("updated_at", { ascending: false });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải lớp học");
  }

  return data ?? [];
}

export async function createTeacherClass(name: string, description?: string | null) {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from("classes").insert({
    name,
    description: description ?? null,
    teacher_id: userData.user?.id,
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể tạo lớp học");
  }
}

export async function getClassDetail(classId: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data: classData, error: classError }, { data: summaryData, error: summaryError }] = await Promise.all([
    supabase
      .from("classes")
      .select("*, class_members(*, profile:profiles(*)), class_root_suggestions(*, root_word:root_words(*))")
      .eq("id", classId)
      .single(),
    supabase.rpc("get_class_progress_summary", {
      p_class_id: classId,
    }),
  ]);

  if (classError) {
    unwrapSupabaseError(classError, "Không thể tải chi tiết lớp");
  }

  if (summaryError) {
    unwrapSupabaseError(summaryError, "Không thể tải tổng hợp lớp");
  }

  return {
    classData,
    summary: summaryData,
  };
}

export async function addClassMemberByUsername(classId: string, username: string) {
  const supabase = await createServerSupabaseClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("auth_user_id")
    .ilike("username", username)
    .single();

  if (profileError || !profile) {
    unwrapSupabaseError(profileError, "Không tìm thấy học viên với username này");
  }

  const { error } = await supabase.from("class_members").insert({
    class_id: classId,
    user_id: profile!.auth_user_id,
    role_in_class: "student",
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể thêm học viên vào lớp");
  }
}

export async function suggestRootWordForClass(classId: string, rootWordId: string, suggestedDate: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("class_root_suggestions").insert({
    class_id: classId,
    root_word_id: rootWordId,
    suggested_date: suggestedDate,
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể gợi ý từ gốc cho lớp");
  }
}
