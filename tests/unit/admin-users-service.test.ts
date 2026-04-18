import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedRequireRole,
  mockedGetManagedUserById,
  mockedGetManagedUserResourceOwnershipSummary,
  mockedUpdateManagedUserProfileRole,
  mockedDeleteUser,
  mockedStorageRemove,
  mockedGetServerEnv,
} = vi.hoisted(() => ({
  mockedRequireRole: vi.fn(),
  mockedGetManagedUserById: vi.fn(),
  mockedGetManagedUserResourceOwnershipSummary: vi.fn(),
  mockedUpdateManagedUserProfileRole: vi.fn(),
  mockedDeleteUser: vi.fn(),
  mockedStorageRemove: vi.fn(),
  mockedGetServerEnv: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireRole: mockedRequireRole,
}));

vi.mock("@/lib/supabase/env", () => ({
  getServerEnv: mockedGetServerEnv,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    auth: {
      admin: {
        deleteUser: mockedDeleteUser,
      },
    },
    storage: {
      from: vi.fn(() => ({
        remove: mockedStorageRemove,
      })),
    },
  })),
}));

vi.mock("@/server/repositories/admin-users-repository", () => ({
  getManagedUserById: mockedGetManagedUserById,
  getManagedUserResourceOwnershipSummary: mockedGetManagedUserResourceOwnershipSummary,
  updateManagedUserProfileRole: mockedUpdateManagedUserProfileRole,
}));

import { deleteManagedUser, updateManagedUserRole } from "@/server/services/admin-users-service";

describe("admin-users-service", () => {
  beforeEach(() => {
    mockedRequireRole.mockReset();
    mockedGetManagedUserById.mockReset();
    mockedGetManagedUserResourceOwnershipSummary.mockReset();
    mockedUpdateManagedUserProfileRole.mockReset();
    mockedDeleteUser.mockReset();
    mockedStorageRemove.mockReset();
    mockedGetServerEnv.mockReset();

    mockedRequireRole.mockResolvedValue({
      auth_user_id: "admin-1",
      role: "admin",
    });
    mockedGetManagedUserById.mockResolvedValue({
      auth_user_id: "user-2",
      username: "student.an",
      full_name: "Nguyen Van An",
      email: "an@example.com",
      avatar_url: "https://project.supabase.co/storage/v1/object/public/avatars/user-2/avatar.png",
      role: "teacher",
      created_at: "2026-04-18T00:00:00.000Z",
    });
    mockedGetManagedUserResourceOwnershipSummary.mockResolvedValue({
      classCount: 0,
      examCount: 0,
      questionBankItemCount: 0,
    });
    mockedUpdateManagedUserProfileRole.mockResolvedValue({
      auth_user_id: "user-2",
      role: "teacher",
    });
    mockedDeleteUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });
    mockedStorageRemove.mockResolvedValue({
      data: [],
      error: null,
    });
    mockedGetServerEnv.mockReturnValue({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      SUPABASE_AVATAR_BUCKET: "avatars",
    });
  });

  it("blocks self role changes", async () => {
    mockedGetManagedUserById.mockResolvedValue({
      auth_user_id: "admin-1",
      username: "admin.rootly",
      full_name: "Admin Rootly",
      email: "admin@example.com",
      avatar_url: null,
      role: "admin",
      created_at: "2026-04-18T00:00:00.000Z",
    });

    await expect(updateManagedUserRole("admin-1", "teacher")).rejects.toThrow(
      "Bạn không thể tự thay đổi hoặc xóa tài khoản admin hiện tại.",
    );
    expect(mockedUpdateManagedUserProfileRole).not.toHaveBeenCalled();
  });

  it("blocks demotion to student when the target user still owns teaching resources", async () => {
    mockedGetManagedUserResourceOwnershipSummary.mockResolvedValue({
      classCount: 1,
      examCount: 0,
      questionBankItemCount: 0,
    });

    await expect(updateManagedUserRole("user-2", "student")).rejects.toThrow(
      "Không thể hạ người dùng này xuống học viên khi họ vẫn đang sở hữu lớp học, kỳ thi hoặc ngân hàng câu hỏi. Hãy chuyển hoặc xóa các tài nguyên đó trước.",
    );
    expect(mockedUpdateManagedUserProfileRole).not.toHaveBeenCalled();
  });

  it("updates the managed user role when the change is allowed", async () => {
    mockedUpdateManagedUserProfileRole.mockResolvedValue({
      auth_user_id: "user-2",
      username: "admin.an",
      full_name: "Nguyen Van An",
      email: "an@example.com",
      avatar_url: null,
      role: "admin",
      created_at: "2026-04-18T00:00:00.000Z",
    });

    await expect(updateManagedUserRole("user-2", "admin")).resolves.toMatchObject({
      auth_user_id: "user-2",
      role: "admin",
    });
    expect(mockedUpdateManagedUserProfileRole).toHaveBeenCalledWith("user-2", "admin");
  });

  it("blocks self deletion", async () => {
    mockedGetManagedUserById.mockResolvedValue({
      auth_user_id: "admin-1",
      username: "admin.rootly",
      full_name: "Admin Rootly",
      email: "admin@example.com",
      avatar_url: null,
      role: "admin",
      created_at: "2026-04-18T00:00:00.000Z",
    });

    await expect(deleteManagedUser("admin-1")).rejects.toThrow(
      "Bạn không thể tự thay đổi hoặc xóa tài khoản admin hiện tại.",
    );
    expect(mockedDeleteUser).not.toHaveBeenCalled();
  });

  it("removes the avatar object before deleting the user", async () => {
    await expect(deleteManagedUser("user-2")).resolves.toMatchObject({
      auth_user_id: "user-2",
    });

    expect(mockedStorageRemove).toHaveBeenCalledWith(["user-2/avatar.png"]);
    expect(mockedDeleteUser).toHaveBeenCalledWith("user-2");
  });
});
