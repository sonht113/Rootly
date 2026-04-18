import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeProfileSearchText } from "@/lib/utils/profile";
import type { AppRole, ProfileRow } from "@/types/domain";

import { unwrapSupabaseError } from "@/server/repositories/shared";

export const ADMIN_USERS_PAGE_SIZE = 20;

export interface ManagedUserListItem
  extends Pick<ProfileRow, "auth_user_id" | "username" | "full_name" | "email" | "avatar_url" | "role" | "created_at"> {}

export interface ManagedUserResourceOwnershipSummary {
  classCount: number;
  examCount: number;
  questionBankItemCount: number;
}

export interface ManagedUsersPage {
  items: ManagedUserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

function buildManagedUserSearchFilter(query: string | null) {
  if (!query) {
    return null;
  }

  const normalizedQuery = normalizeProfileSearchText(query)
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedQuery) {
    return null;
  }

  return `full_name_search.ilike.%${normalizedQuery}%,username.ilike.%${normalizedQuery}%,email.ilike.%${normalizedQuery}%`;
}

export async function getManagedUsersPage(input: {
  query: string | null;
  role?: AppRole;
  page: number;
  pageSize?: number;
}): Promise<ManagedUsersPage> {
  const supabaseAdmin = getSupabaseAdmin();
  const pageSize = input.pageSize ?? ADMIN_USERS_PAGE_SIZE;
  const searchFilter = buildManagedUserSearchFilter(input.query);
  let countQuery: any = supabaseAdmin.from("profiles").select("auth_user_id", { count: "exact", head: true });

  if (input.role) {
    countQuery = countQuery.eq("role", input.role);
  }

  if (searchFilter) {
    countQuery = countQuery.or(searchFilter);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    unwrapSupabaseError(countError, "Không thể đếm số lượng người dùng");
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(input.page, totalPages);
  const pageStart = (page - 1) * pageSize;
  const pageEnd = pageStart + pageSize - 1;

  let listQuery: any = supabaseAdmin
    .from("profiles")
    .select("auth_user_id, username, full_name, email, avatar_url, role, created_at")
    .order("created_at", { ascending: false })
    .range(pageStart, pageEnd);

  if (input.role) {
    listQuery = listQuery.eq("role", input.role);
  }

  if (searchFilter) {
    listQuery = listQuery.or(searchFilter);
  }

  const { data, error } = await listQuery;

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách người dùng");
  }

  return {
    items: ((data ?? []) as ManagedUserListItem[]).map((item) => ({
      auth_user_id: item.auth_user_id,
      username: item.username,
      full_name: item.full_name,
      email: item.email,
      avatar_url: item.avatar_url,
      role: item.role,
      created_at: item.created_at,
    })),
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}

export async function getManagedUserById(authUserId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("auth_user_id, username, full_name, email, avatar_url, role, created_at")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    unwrapSupabaseError(error, "Không thể tải hồ sơ người dùng cần quản lý");
  }

  return (data ?? null) as ManagedUserListItem | null;
}

export async function updateManagedUserProfileRole(authUserId: string, nextRole: AppRole) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      role: nextRole,
    })
    .eq("auth_user_id", authUserId)
    .select("auth_user_id, username, full_name, email, avatar_url, role, created_at")
    .single();

  if (error || !data) {
    unwrapSupabaseError(error, "Không thể cập nhật vai trò người dùng");
  }

  return data as ManagedUserListItem;
}

export async function getManagedUserResourceOwnershipSummary(authUserId: string): Promise<ManagedUserResourceOwnershipSummary> {
  const supabaseAdmin = getSupabaseAdmin();
  const [classesResult, examsResult, questionBankItemsResult] = await Promise.all([
    supabaseAdmin.from("classes").select("id", { count: "exact", head: true }).eq("teacher_id", authUserId),
    supabaseAdmin.from("exams").select("id", { count: "exact", head: true }).eq("created_by", authUserId),
    supabaseAdmin
      .from("exam_question_bank_items")
      .select("id", { count: "exact", head: true })
      .eq("created_by", authUserId),
  ]);

  if (classesResult.error) {
    unwrapSupabaseError(classesResult.error, "Không thể kiểm tra lớp học người dùng đang sở hữu");
  }

  if (examsResult.error) {
    unwrapSupabaseError(examsResult.error, "Không thể kiểm tra kỳ thi người dùng đang sở hữu");
  }

  if (questionBankItemsResult.error) {
    unwrapSupabaseError(questionBankItemsResult.error, "Không thể kiểm tra ngân hàng câu hỏi người dùng đang sở hữu");
  }

  return {
    classCount: classesResult.count ?? 0,
    examCount: examsResult.count ?? 0,
    questionBankItemCount: questionBankItemsResult.count ?? 0,
  };
}
