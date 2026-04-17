import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClassAccess = vi.fn();
const mockSessionMemberLookup = vi.fn();
const mockSessionMemberInsert = vi.fn();
const mockAdminClassMembers = vi.fn();
const mockAdminProfilesSearch = vi.fn();
const mockAdminProfileById = vi.fn();
const mockAdminProfilesEq = vi.fn();
const mockAdminProfilesIlike = vi.fn();
const mockAdminProfilesOrder = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "classes") {
        const query = {
          eq: () => query,
          maybeSingle: mockClassAccess,
        };

        return {
          select: () => query,
        };
      }

      if (table === "class_members") {
        const selectQuery = {
          eq: () => selectQuery,
          maybeSingle: mockSessionMemberLookup,
        };

        return {
          select: () => selectQuery,
          insert: mockSessionMemberInsert,
        };
      }

      throw new Error(`Unexpected session table mock: ${table}`);
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "class_members") {
        return {
          select: () => ({
            eq: mockAdminClassMembers,
          }),
        };
      }

      if (table === "profiles") {
        const searchQuery = {
          eq: (...args: unknown[]) => {
            mockAdminProfilesEq(...args);
            return searchQuery;
          },
          ilike: (...args: unknown[]) => {
            mockAdminProfilesIlike(...args);
            return searchQuery;
          },
          order: (...args: unknown[]) => {
            mockAdminProfilesOrder(...args);
            return searchQuery;
          },
          limit: mockAdminProfilesSearch,
          maybeSingle: mockAdminProfileById,
        };

        return {
          select: () => searchQuery,
        };
      }

      throw new Error(`Unexpected admin table mock: ${table}`);
    },
  })),
}));

import { addClassMemberByUserId, searchClassMemberCandidates } from "@/server/repositories/classes-repository";

describe("classes repository member management", () => {
  beforeEach(() => {
    mockClassAccess.mockReset();
    mockSessionMemberLookup.mockReset();
    mockSessionMemberInsert.mockReset();
    mockAdminClassMembers.mockReset();
    mockAdminProfilesSearch.mockReset();
    mockAdminProfileById.mockReset();
    mockAdminProfilesEq.mockReset();
    mockAdminProfilesIlike.mockReset();
    mockAdminProfilesOrder.mockReset();

    mockClassAccess.mockResolvedValue({
      data: { id: "class-1" },
      error: null,
    });
  });

  it("searches student candidates by full_name and supports accent-insensitive matching", async () => {
    mockAdminClassMembers.mockResolvedValue({
      data: [{ user_id: "student-2" }],
      error: null,
    });
    mockAdminProfilesSearch.mockResolvedValue({
      data: [
        { auth_user_id: "student-1", full_name: "Nguyễn An", username: "an.nguyen" },
        { auth_user_id: "student-2", full_name: "Nguyễn Bình", username: "binh.nguyen" },
        { auth_user_id: "student-3", full_name: "Lê Nguyễn Chi", username: "chi.le" },
      ],
      error: null,
    });

    await expect(searchClassMemberCandidates("class-1", "Nguyễn")).resolves.toEqual([
      { userId: "student-1", fullName: "Nguyễn An", username: "an.nguyen" },
      { userId: "student-3", fullName: "Lê Nguyễn Chi", username: "chi.le" },
    ]);
    expect(mockAdminProfilesEq).toHaveBeenCalledWith("role", "student");
    expect(mockAdminProfilesIlike).toHaveBeenCalledWith("full_name_search", "%nguyen%");
    expect(mockAdminProfilesOrder).toHaveBeenCalledWith("full_name");
  });

  it("refuses to search candidates when the current user cannot manage the class", async () => {
    mockClassAccess.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(searchClassMemberCandidates("class-1", "nguyen")).rejects.toThrow(
      "Bạn không có quyền quản lý lớp này.",
    );
  });

  it("rejects adding a student who is already a class member", async () => {
    mockAdminProfileById.mockResolvedValue({
      data: {
        auth_user_id: "student-1",
        full_name: "Nguyễn Văn An",
        username: "son",
        role: "student",
      },
      error: null,
    });
    mockSessionMemberLookup.mockResolvedValue({
      data: { id: "member-1" },
      error: null,
    });

    await expect(addClassMemberByUserId("class-1", "student-1")).rejects.toThrow(
      "Học viên Nguyễn Văn An (@son) đã ở trong lớp này.",
    );
    expect(mockSessionMemberInsert).not.toHaveBeenCalled();
  });

  it("adds a selected student by user id", async () => {
    mockAdminProfileById.mockResolvedValue({
      data: {
        auth_user_id: "student-1",
        full_name: "Nguyễn Văn An",
        username: "son",
        role: "student",
      },
      error: null,
    });
    mockSessionMemberLookup.mockResolvedValue({
      data: null,
      error: null,
    });
    mockSessionMemberInsert.mockResolvedValue({
      error: null,
    });

    await expect(addClassMemberByUserId("class-1", "student-1")).resolves.toEqual({
      userId: "student-1",
      fullName: "Nguyễn Văn An",
      username: "son",
    });

    expect(mockSessionMemberInsert).toHaveBeenCalledWith({
      class_id: "class-1",
      user_id: "student-1",
      role_in_class: "student",
    });
  });
});
