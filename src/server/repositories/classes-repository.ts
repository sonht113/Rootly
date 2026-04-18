import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeProfileSearchText } from "@/lib/utils/profile";
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
  fullName: string;
  username: string;
}

export interface CurrentStudentClass {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export interface ClassLessonVocabularyItem {
  id: string;
  lessonId: string;
  word: string;
  meaning: string;
  synonyms: string[];
  exampleSentences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassLesson {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  vocabularyItemCount: number;
  createdAt: string;
  updatedAt: string;
  vocabularyItems: ClassLessonVocabularyItem[];
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

function mapClassLessonVocabularyItem(item: {
  id: string;
  lesson_id: string;
  word: string;
  meaning: string;
  synonyms: string[] | null;
  example_sentences: string[] | null;
  created_at: string;
  updated_at: string;
}): ClassLessonVocabularyItem {
  return {
    id: item.id,
    lessonId: item.lesson_id,
    word: item.word,
    meaning: item.meaning,
    synonyms: item.synonyms ?? [],
    exampleSentences: item.example_sentences ?? [],
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
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

export async function createClassLesson(classId: string, title: string, description?: string | null) {
  const supabase = await assertClassManagementAccess(classId);
  const { error } = await supabase.from("class_lessons").insert({
    class_id: classId,
    title,
    description: description ?? null,
  });

  if (error) {
    unwrapSupabaseError(error, "KhÃ´ng thá»ƒ táº¡o buá»•i há»c");
  }
}

export async function deleteClassLesson(classId: string, lessonId: string) {
  const supabase = await assertClassManagementAccess(classId);
  const { error } = await supabase.from("class_lessons").delete().eq("id", lessonId).eq("class_id", classId);

  if (error) {
    unwrapSupabaseError(error, "KhÃ´ng thá»ƒ xÃ³a buá»•i há»c");
  }
}

export async function replaceClassLessonVocabulary(
  classId: string,
  lessonId: string,
  items: Array<{
    word: string;
    meaning: string;
    synonyms: string[];
    exampleSentences: string[];
  }>,
) {
  const supabase = await assertClassManagementAccess(classId);
  const { data: lesson, error: lessonError } = await supabase
    .from("class_lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("class_id", classId)
    .maybeSingle();

  if (lessonError) {
    unwrapSupabaseError(lessonError, "KhÃ´ng thá»ƒ xÃ¡c minh buá»•i há»c cáº§n cáº­p nháº­t");
  }

  if (!lesson) {
    throw new Error("KhÃ´ng tÃ¬m tháº¥y buá»•i há»c thuá»™c lá»›p hiá»‡n táº¡i.");
  }

  const payload = items.map((item) => ({
    word: item.word,
    meaning: item.meaning,
    synonyms: item.synonyms,
    example_sentences: item.exampleSentences,
  }));

  const { data, error } = await supabase.rpc("replace_class_lesson_vocabulary", {
    p_lesson_id: lessonId,
    p_items: payload,
  });

  if (error) {
    unwrapSupabaseError(error, "KhÃ´ng thá»ƒ cáº­p nháº­t tá»« vá»±ng cho buá»•i há»c");
  }

  return Number(data ?? 0);
}

export async function getClassLessons(classId: string): Promise<ClassLesson[]> {
  const supabase = await createServerSupabaseClient();
  const { data: lessons, error: lessonsError } = await supabase
    .from("class_lessons")
    .select("id, class_id, title, description, vocabulary_item_count, created_at, updated_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (lessonsError) {
    unwrapSupabaseError(lessonsError, "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch buá»•i há»c");
  }

  const normalizedLessons = (lessons ?? []) as Array<{
    id: string;
    class_id: string;
    title: string;
    description: string | null;
    vocabulary_item_count: number;
    created_at: string;
    updated_at: string;
  }>;

  if (normalizedLessons.length === 0) {
    return [];
  }

  const lessonIds = normalizedLessons.map((lesson) => lesson.id);
  const { data: vocabularyItems, error: vocabularyError } = await supabase
    .from("class_lesson_vocab_items")
    .select("id, lesson_id, word, meaning, synonyms, example_sentences, created_at, updated_at")
    .in("lesson_id", lessonIds)
    .order("created_at", { ascending: true });

  if (vocabularyError) {
    unwrapSupabaseError(vocabularyError, "KhÃ´ng thá»ƒ táº£i tá»« vá»±ng cá»§a buá»•i há»c");
  }

  const vocabularyByLessonId = new Map<string, ClassLessonVocabularyItem[]>();

  for (const item of ((vocabularyItems ?? []) as Array<{
    id: string;
    lesson_id: string;
    word: string;
    meaning: string;
    synonyms: string[] | null;
    example_sentences: string[] | null;
    created_at: string;
    updated_at: string;
  }>)) {
    const lessonVocabularyItems = vocabularyByLessonId.get(item.lesson_id) ?? [];
    lessonVocabularyItems.push(mapClassLessonVocabularyItem(item));
    vocabularyByLessonId.set(item.lesson_id, lessonVocabularyItems);
  }

  return normalizedLessons.map((lesson) => ({
    id: lesson.id,
    classId: lesson.class_id,
    title: lesson.title,
    description: lesson.description,
    vocabularyItemCount: lesson.vocabulary_item_count ?? 0,
    createdAt: lesson.created_at,
    updatedAt: lesson.updated_at,
    vocabularyItems: vocabularyByLessonId.get(lesson.id) ?? [],
  }));
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

  const normalizedQuery = normalizeProfileSearchText(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  const supabaseAdmin = getSupabaseAdmin();
  const [{ data: existingMembers, error: membersError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabaseAdmin.from("class_members").select("user_id").eq("class_id", classId),
    supabaseAdmin
      .from("profiles")
      .select("auth_user_id, full_name, username")
      .eq("role", "student")
      .ilike("full_name_search", `%${normalizedQuery}%`)
      .order("full_name")
      .limit(25),
  ]);

  if (membersError) {
    unwrapSupabaseError(membersError, "Không thể tải thành viên hiện tại của lớp");
  }

  if (profilesError) {
    unwrapSupabaseError(profilesError, "Không thể tìm học viên phù hợp");
  }

  const existingMemberIds = new Set((existingMembers ?? []).map((member) => member.user_id));

  return ((profiles ?? []) as Array<{ auth_user_id: string; full_name: string; username: string }>)
    .filter((profile) => !existingMemberIds.has(profile.auth_user_id))
    .sort((left, right) => {
      const leftPrefix = normalizeProfileSearchText(left.full_name).startsWith(normalizedQuery) ? 0 : 1;
      const rightPrefix = normalizeProfileSearchText(right.full_name).startsWith(normalizedQuery) ? 0 : 1;

      if (leftPrefix !== rightPrefix) {
        return leftPrefix - rightPrefix;
      }

      return left.full_name.localeCompare(right.full_name, "vi");
    })
    .slice(0, 10)
    .map((profile) => ({
      userId: profile.auth_user_id,
      fullName: profile.full_name,
      username: profile.username,
    }));
}

export async function addClassMemberByUserId(classId: string, userId: string) {
  const supabase = await assertClassManagementAccess(classId);
  const supabaseAdmin = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("auth_user_id, full_name, username, role")
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
    throw new Error(`Học viên ${profile.full_name} (@${profile.username}) đã ở trong lớp này.`);
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
    fullName: profile.full_name,
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
