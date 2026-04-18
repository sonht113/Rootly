import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedRevalidatePath,
  mockedDeleteManagedUser,
  mockedUpdateManagedUserRole,
} = vi.hoisted(() => ({
  mockedRevalidatePath: vi.fn(),
  mockedDeleteManagedUser: vi.fn(),
  mockedUpdateManagedUserRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockedRevalidatePath,
}));

vi.mock("@/server/services/admin-users-service", () => ({
  deleteManagedUser: mockedDeleteManagedUser,
  updateManagedUserRole: mockedUpdateManagedUserRole,
}));

import { deleteManagedUserAction, updateManagedUserRoleAction } from "@/features/admin-users/actions/admin-users";

describe("admin-users actions", () => {
  beforeEach(() => {
    mockedRevalidatePath.mockReset();
    mockedDeleteManagedUser.mockReset();
    mockedUpdateManagedUserRole.mockReset();
  });

  it("validates and updates a managed user role", async () => {
    mockedUpdateManagedUserRole.mockResolvedValue({
      full_name: "Nguyen Van An",
    });

    await expect(
      updateManagedUserRoleAction({
        targetUserId: "11111111-1111-4111-8111-111111111111",
        nextRole: "teacher",
      }),
    ).resolves.toEqual({
      success: true,
      message: "Đã cập nhật vai trò cho Nguyen Van An.",
    });

    expect(mockedUpdateManagedUserRole).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "teacher",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("rejects invalid role update payloads", async () => {
    await expect(
      updateManagedUserRoleAction({
        targetUserId: "not-a-uuid",
        nextRole: "teacher",
      }),
    ).resolves.toMatchObject({
      success: false,
    });

    expect(mockedUpdateManagedUserRole).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it("validates and deletes a managed user", async () => {
    mockedDeleteManagedUser.mockResolvedValue({
      full_name: "Nguyen Van An",
    });

    await expect(
      deleteManagedUserAction({
        targetUserId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toEqual({
      success: true,
      message: "Đã xóa Nguyen Van An khỏi hệ thống.",
    });

    expect(mockedDeleteManagedUser).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/users");
  });
});
