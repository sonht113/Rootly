import { normalizeUsername } from "@/lib/auth/username";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RootLevel, UserRootPlanSource } from "@/types/domain";

import { runSupabaseReadQueryWithRetry, unwrapSupabaseError } from "@/server/repositories/shared";

const USER_ROOT_PLAN_UNIQUE_CONSTRAINTS = [
  "user_root_plans_user_id_root_word_id_key",
  "user_root_plans_user_id_root_word_id_scheduled_date_key",
] as const;

export interface CurrentUserClassSuggestion {
  id: string;
  classId: string;
  className: string;
  rootWord: {
    id: string;
    root: string;
    meaning: string;
    level: RootLevel;
  };
  suggestedDate: string;
  status: "pending" | "accepted" | "scheduled";
}

export interface ClassMemberCandidate {
  userId: string;
  username: string;
}

export interface CurrentStudentClass {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

type ClassCountRelation =
  | {
      id: string;
      name: string;
      description: string | null;
      class_members: Array<{ count: number }> | null;
    }
  | Array<{
      id: string;
      name: string;
      description: string | null;
      class_members: Array<{ count: number }> | null;
    }>
  | null;

function resolveClassCountRelation(relation: ClassCountRelation) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function mapCurrentStudentClass(relation: ClassCountRelation): CurrentStudentClass | null {
  const classRecord = resolveClassCountRelation(relation);

  if (!classRecord) {
    return null;
  }

  return {
    id: classRecord.id,
    name: classRecord.name,
    description: classRecord.description,
    memberCount: classRecord.class_members?.[0]?.count ?? 0,
  };
}

function isUserRootPlanUniqueViolation(error: { message?: string } | null) {
  if (!error?.message) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  return (
    normalizedMessage.includes("duplicate key value violates unique constraint") &&
    USER_ROOT_PLAN_UNIQUE_CONSTRAINTS.some((constraint) => normalizedMessage.includes(constraint))
  );
}

function getSuggestionPlanStatus(source: UserRootPlanSource) {
  return source === "teacher_suggested" ? "accepted" : "scheduled";
}

async function assertClassManagementAccess(classId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: managedClass, error } = await supabase.from("classes").select("id").eq("id", classId).maybeSingle();

  if (error) {
    unwrapSupabaseError(error, "Không thể xác minh quyền quản lý lớp");
  }

  if (!managedClass) {
    throw new Error("Bạn không có quyền quản lý lớp này.");
  }

  return supabase;
}

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

export async function searchClassMemberCandidates(classId: string, query: string): Promise<ClassMemberCandidate[]> {
  await assertClassManagementAccess(classId);

  const normalizedQuery = normalizeUsername(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  const supabaseAdmin = getSupabaseAdmin();
  const [{ data: existingMembers, error: membersError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabaseAdmin.from("class_members").select("user_id").eq("class_id", classId),
    supabaseAdmin
      .from("profiles")
      .select("auth_user_id, username")
      .eq("role", "student")
      .ilike("username", `${normalizedQuery}%`)
      .order("username")
      .limit(25),
  ]);

  if (membersError) {
    unwrapSupabaseError(membersError, "Không thể tải thành viên hiện tại của lớp");
  }

  if (profilesError) {
    unwrapSupabaseError(profilesError, "Không thể tìm học viên phù hợp");
  }

  const existingMemberIds = new Set((existingMembers ?? []).map((member) => member.user_id));

  return ((profiles ?? []) as Array<{ auth_user_id: string; username: string }>)
    .filter((profile) => !existingMemberIds.has(profile.auth_user_id))
    .slice(0, 10)
    .map((profile) => ({
      userId: profile.auth_user_id,
      username: profile.username,
    }));
}

export async function addClassMemberByUserId(classId: string, userId: string) {
  const supabase = await assertClassManagementAccess(classId);
  const supabaseAdmin = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("auth_user_id, username, role")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (profileError) {
    unwrapSupabaseError(profileError, "Không thể tải hồ sơ học viên đã chọn");
  }

  if (!profile || profile.role !== "student") {
    throw new Error("Không tìm thấy học viên hợp lệ để thêm vào lớp.");
  }

  const { data: existingMember, error: existingMemberError } = await supabase
    .from("class_members")
    .select("id")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMemberError) {
    unwrapSupabaseError(existingMemberError, "Không thể kiểm tra thành viên hiện tại của lớp");
  }

  if (existingMember) {
    throw new Error(`Học viên ${profile.username} đã ở trong lớp này.`);
  }

  const { error } = await supabase.from("class_members").insert({
    class_id: classId,
    user_id: profile.auth_user_id,
    role_in_class: "student",
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể thêm học viên vào lớp");
  }

  return {
    userId: profile.auth_user_id,
    username: profile.username,
  };
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

export async function removeClassMember(memberId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("class_members").delete().eq("id", memberId);

  if (error) {
    unwrapSupabaseError(error, "Không thể xóa học viên khỏi lớp");
  }
}

export async function getCurrentStudentClasses(): Promise<CurrentStudentClass[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    unwrapSupabaseError(authError, "Không thể xác thực người dùng hiện tại");
  }

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("class_members")
    .select("class:classes(id, name, description, class_members(count))")
    .eq("user_id", user.id)
    .eq("role_in_class", "student")
    .order("created_at", { ascending: false });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách lớp học của bạn");
  }

  return ((data ?? []) as Array<{ class: ClassCountRelation }>)
    .flatMap((row) => {
      const classItem = mapCurrentStudentClass(row.class);
      return classItem ? [classItem] : [];
    });
}

export async function getCurrentStudentClass(classId: string): Promise<CurrentStudentClass | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    unwrapSupabaseError(authError, "Không thể xác thực người dùng hiện tại");
  }

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("class_members")
    .select("class:classes(id, name, description, class_members(count))")
    .eq("user_id", user.id)
    .eq("role_in_class", "student")
    .eq("class_id", classId)
    .maybeSingle();

  if (error) {
    unwrapSupabaseError(error, "Không thể tải chi tiết lớp học");
  }

  if (!data) {
    return null;
  }

  return mapCurrentStudentClass((data as { class: ClassCountRelation }).class);
}

export async function getCurrentUserClassSuggestions(): Promise<CurrentUserClassSuggestion[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    unwrapSupabaseError(authError, "Không thể xác thực người dùng hiện tại");
  }

  if (!user) {
    return [];
  }

  const { data: memberships, error: membershipError } = await runSupabaseReadQueryWithRetry(() =>
    supabase.from("class_members").select("class_id").eq("user_id", user.id).eq("role_in_class", "student"),
  );

  if (membershipError) {
    unwrapSupabaseError(membershipError, "Khong the xac dinh danh sach lop hoc cua ban");
  }

  const classIds = Array.from(
    new Set(((memberships ?? []) as Array<{ class_id: string }>).map((membership) => membership.class_id)),
  );

  if (classIds.length === 0) {
    return [];
  }

  const { data: suggestions, error: suggestionError } = await runSupabaseReadQueryWithRetry(() =>
    supabase
      .from("class_root_suggestions")
      .select("id, class_id, root_word_id, suggested_date, class:classes(id, name), root_word:root_words(id, root, meaning, level)")
      .in("class_id", classIds)
      .order("suggested_date", { ascending: true })
      .order("created_at", { ascending: false }),
  );

  if (suggestionError) {
    unwrapSupabaseError(suggestionError, "Không thể tải danh sách gợi ý từ lớp");
  }

  const normalizedSuggestions = ((suggestions ?? []) as Array<{
    id: string;
    class_id: string;
    root_word_id: string;
    suggested_date: string;
    class:
      | {
          id: string;
          name: string;
        }
      | Array<{
          id: string;
          name: string;
        }>
      | null;
    root_word:
      | {
          id: string;
          root: string;
          meaning: string;
          level: RootLevel;
        }
      | Array<{
          id: string;
          root: string;
          meaning: string;
          level: RootLevel;
        }>
      | null;
  }>);

  if (normalizedSuggestions.length === 0) {
    return [];
  }

  const rootWordIds = Array.from(new Set(normalizedSuggestions.map((suggestion) => suggestion.root_word_id)));
  const { data: plans, error: planError } = await runSupabaseReadQueryWithRetry(() =>
    supabase
      .from("user_root_plans")
      .select("root_word_id, source")
      .eq("user_id", user.id)
      .in("root_word_id", rootWordIds),
  );

  if (planError) {
    unwrapSupabaseError(planError, "Không thể xác định trạng thái chấp nhận gợi ý");
  }

  const planSourceByRootWordId = new Map<string, UserRootPlanSource>();

  for (const plan of plans ?? []) {
    const nextSource = plan.source as UserRootPlanSource;
    const existingSource = planSourceByRootWordId.get(plan.root_word_id);

    if (!existingSource || nextSource === "teacher_suggested") {
      planSourceByRootWordId.set(plan.root_word_id, nextSource);
    }
  }

  return normalizedSuggestions.flatMap((suggestion) => {
    const classRecord = Array.isArray(suggestion.class) ? suggestion.class[0] : suggestion.class;
    const rootWord = Array.isArray(suggestion.root_word) ? suggestion.root_word[0] : suggestion.root_word;

    if (!classRecord || !rootWord) {
      return [];
    }

    const planSource = planSourceByRootWordId.get(suggestion.root_word_id);
    const status = planSource ? getSuggestionPlanStatus(planSource) : "pending";

    return [
      {
        id: suggestion.id,
        classId: classRecord.id,
        className: classRecord.name,
        rootWord: {
          id: rootWord.id,
          root: rootWord.root,
          meaning: rootWord.meaning,
          level: rootWord.level,
        },
        suggestedDate: suggestion.suggested_date,
        status,
      },
    ];
  });
}

export async function acceptClassSuggestionIntoPlan(suggestionId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    unwrapSupabaseError(authError, "Không thể xác thực người dùng hiện tại");
  }

  if (!user) {
    throw new Error("Bạn cần đăng nhập để nhận gợi ý từ lớp.");
  }

  const { data: suggestion, error: suggestionError } = await supabase
    .from("class_root_suggestions")
    .select("id, class_id, root_word_id, suggested_date, class:classes(id, name), root_word:root_words(id, root, meaning)")
    .eq("id", suggestionId)
    .single();

  if (suggestionError || !suggestion) {
    unwrapSupabaseError(suggestionError, "Không tìm thấy gợi ý từ lớp này");
  }

  if (!suggestion) {
    throw new Error("Không tìm thấy gợi ý từ lớp này");
  }

  const resolvedSuggestion = suggestion;

  const { data: existingPlans, error: existingPlanError } = await supabase
    .from("user_root_plans")
    .select("id, source")
    .eq("user_id", user.id)
    .eq("root_word_id", resolvedSuggestion.root_word_id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existingPlanError) {
    unwrapSupabaseError(existingPlanError, "Không thể kiểm tra lịch học hiện tại");
  }

  const existingPlan = (existingPlans ?? [])[0] ?? null;
  const rootWord = Array.isArray(resolvedSuggestion.root_word) ? resolvedSuggestion.root_word[0] : resolvedSuggestion.root_word;

  if (existingPlan) {
    return {
      status: getSuggestionPlanStatus(existingPlan.source as UserRootPlanSource),
      rootWordLabel: rootWord?.root ?? "từ gốc này",
      suggestedDate: resolvedSuggestion.suggested_date,
    };
  }

  const { error: insertError } = await supabase.from("user_root_plans").insert({
    user_id: user.id,
    root_word_id: resolvedSuggestion.root_word_id,
    scheduled_date: resolvedSuggestion.suggested_date,
    source: "teacher_suggested",
  });

  if (insertError) {
    if (isUserRootPlanUniqueViolation(insertError)) {
      const { data: conflictedPlans, error: conflictedPlanError } = await supabase
        .from("user_root_plans")
        .select("id, source")
        .eq("user_id", user.id)
        .eq("root_word_id", resolvedSuggestion.root_word_id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (conflictedPlanError) {
        unwrapSupabaseError(conflictedPlanError, "Khong the kiem tra lich hoc hien tai");
      }

      const conflictedPlan = (conflictedPlans ?? [])[0] ?? null;
      if (conflictedPlan) {
        return {
          status: getSuggestionPlanStatus(conflictedPlan.source as UserRootPlanSource),
          rootWordLabel: rootWord?.root ?? "tu goc nay",
          suggestedDate: resolvedSuggestion.suggested_date,
        };
      }
    }

    unwrapSupabaseError(insertError, "Không thể đưa gợi ý vào lịch học cá nhân");
  }

  return {
    status: "accepted" as const,
    rootWordLabel: rootWord?.root ?? "từ gốc này",
    suggestedDate: resolvedSuggestion.suggested_date,
  };
}
