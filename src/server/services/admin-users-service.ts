import { requireRole } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/supabase/env";
import { extractPublicStorageObjectPath } from "@/lib/utils/public-storage";
import type { AppRole } from "@/types/domain";

import {
  getManagedUserById,
  getManagedUserResourceOwnershipSummary,
  updateManagedUserProfileRole,
} from "@/server/repositories/admin-users-repository";

function isMissingStorageObjectError(errorMessage: string | undefined) {
  if (!errorMessage) {
    return false;
  }

  return /not found|does not exist/i.test(errorMessage);
}

async function getAdminActorAndManagedUser(targetUserId: string) {
  const actor = await requireRole(["admin"]);

  if (actor.auth_user_id === targetUserId) {
    throw new Error("Bạn không thể tự thay đổi hoặc xóa tài khoản admin hiện tại.");
  }

  const managedUser = await getManagedUserById(targetUserId);
  if (!managedUser) {
    throw new Error("Không tìm thấy người dùng cần quản lý.");
  }

  return {
    actor,
    managedUser,
  };
}

async function assertManagedUserCanBecomeStudent(targetUserId: string) {
  const ownershipSummary = await getManagedUserResourceOwnershipSummary(targetUserId);

  if (
    ownershipSummary.classCount === 0 &&
    ownershipSummary.examCount === 0 &&
    ownershipSummary.questionBankItemCount === 0
  ) {
    return;
  }

  throw new Error(
    "Không thể hạ người dùng này xuống học viên khi họ vẫn đang sở hữu lớp học, kỳ thi hoặc ngân hàng câu hỏi. Hãy chuyển hoặc xóa các tài nguyên đó trước.",
  );
}

async function removeManagedUserAvatar(avatarUrl: string | null) {
  const env = getServerEnv();
  const objectPath = extractPublicStorageObjectPath(avatarUrl, {
    baseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    bucket: env.SUPABASE_AVATAR_BUCKET,
  });

  if (!objectPath) {
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage.from(env.SUPABASE_AVATAR_BUCKET).remove([objectPath]);

  if (error && !isMissingStorageObjectError(error.message)) {
    throw new Error(error.message || "Không thể dọn avatar trước khi xóa người dùng.");
  }
}

export async function updateManagedUserRole(targetUserId: string, nextRole: AppRole) {
  const { managedUser } = await getAdminActorAndManagedUser(targetUserId);

  if (managedUser.role === nextRole) {
    return managedUser;
  }

  if (nextRole === "student") {
    await assertManagedUserCanBecomeStudent(targetUserId);
  }

  return updateManagedUserProfileRole(targetUserId, nextRole);
}

export async function deleteManagedUser(targetUserId: string) {
  const { managedUser } = await getAdminActorAndManagedUser(targetUserId);

  await removeManagedUserAvatar(managedUser.avatar_url);

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

  if (error) {
    throw new Error(error.message || "Không thể xóa người dùng khỏi hệ thống.");
  }

  return managedUser;
}
