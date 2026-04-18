import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedProfilesCountEq,
  mockedProfilesCountOr,
  mockedProfilesListEq,
  mockedProfilesListOr,
  mockedProfilesListOrder,
  mockedProfilesListRange,
  mockedClassesCountEq,
  mockedExamsCountEq,
  mockedQuestionBankItemsCountEq,
} = vi.hoisted(() => ({
  mockedProfilesCountEq: vi.fn(),
  mockedProfilesCountOr: vi.fn(),
  mockedProfilesListEq: vi.fn(),
  mockedProfilesListOr: vi.fn(),
  mockedProfilesListOrder: vi.fn(),
  mockedProfilesListRange: vi.fn(),
  mockedClassesCountEq: vi.fn(),
  mockedExamsCountEq: vi.fn(),
  mockedQuestionBankItemsCountEq: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: (_columns: string, options?: { count?: string; head?: boolean }) => {
            if (options?.head) {
              const countQuery = {
                count: 21,
                error: null,
                eq: (...args: unknown[]) => {
                  mockedProfilesCountEq(...args);
                  return countQuery;
                },
                or: (...args: unknown[]) => {
                  mockedProfilesCountOr(...args);
                  return countQuery;
                },
              };

              return countQuery;
            }

            const listQuery = {
              data: [
                {
                  auth_user_id: "user-1",
                  username: "teacher.an",
                  full_name: "Nguyen Van An",
                  email: "an@example.com",
                  avatar_url: null,
                  role: "teacher",
                  created_at: "2026-04-18T00:00:00.000Z",
                },
              ],
              error: null,
              eq: (...args: unknown[]) => {
                mockedProfilesListEq(...args);
                return listQuery;
              },
              or: (...args: unknown[]) => {
                mockedProfilesListOr(...args);
                return listQuery;
              },
              order: (...args: unknown[]) => {
                mockedProfilesListOrder(...args);
                return listQuery;
              },
              range: (...args: unknown[]) => {
                mockedProfilesListRange(...args);
                return listQuery;
              },
            };

            return listQuery;
          },
        };
      }

      if (table === "classes") {
        const query = {
          count: 2,
          error: null,
          eq: (...args: unknown[]) => {
            mockedClassesCountEq(...args);
            return query;
          },
        };

        return {
          select: () => query,
        };
      }

      if (table === "exams") {
        const query = {
          count: 3,
          error: null,
          eq: (...args: unknown[]) => {
            mockedExamsCountEq(...args);
            return query;
          },
        };

        return {
          select: () => query,
        };
      }

      if (table === "exam_question_bank_items") {
        const query = {
          count: 4,
          error: null,
          eq: (...args: unknown[]) => {
            mockedQuestionBankItemsCountEq(...args);
            return query;
          },
        };

        return {
          select: () => query,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  })),
}));

import { getManagedUserResourceOwnershipSummary, getManagedUsersPage } from "@/server/repositories/admin-users-repository";

describe("admin-users repository", () => {
  beforeEach(() => {
    mockedProfilesCountEq.mockReset();
    mockedProfilesCountOr.mockReset();
    mockedProfilesListEq.mockReset();
    mockedProfilesListOr.mockReset();
    mockedProfilesListOrder.mockReset();
    mockedProfilesListRange.mockReset();
    mockedClassesCountEq.mockReset();
    mockedExamsCountEq.mockReset();
    mockedQuestionBankItemsCountEq.mockReset();
  });

  it("applies search, role filters, and pagination when listing managed users", async () => {
    await expect(
      getManagedUsersPage({
        query: "Nguyễn (An)",
        role: "teacher",
        page: 99,
      }),
    ).resolves.toEqual({
      items: [
        {
          auth_user_id: "user-1",
          username: "teacher.an",
          full_name: "Nguyen Van An",
          email: "an@example.com",
          avatar_url: null,
          role: "teacher",
          created_at: "2026-04-18T00:00:00.000Z",
        },
      ],
      page: 2,
      pageSize: 20,
      totalCount: 21,
      totalPages: 2,
    });

    expect(mockedProfilesCountEq).toHaveBeenCalledWith("role", "teacher");
    expect(mockedProfilesListEq).toHaveBeenCalledWith("role", "teacher");
    expect(mockedProfilesCountOr).toHaveBeenCalledWith(
      "full_name_search.ilike.%nguyen an%,username.ilike.%nguyen an%,email.ilike.%nguyen an%",
    );
    expect(mockedProfilesListOr).toHaveBeenCalledWith(
      "full_name_search.ilike.%nguyen an%,username.ilike.%nguyen an%,email.ilike.%nguyen an%",
    );
    expect(mockedProfilesListOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockedProfilesListRange).toHaveBeenCalledWith(20, 39);
  });

  it("summarizes owned resources before a user is demoted or deleted", async () => {
    await expect(getManagedUserResourceOwnershipSummary("user-2")).resolves.toEqual({
      classCount: 2,
      examCount: 3,
      questionBankItemCount: 4,
    });

    expect(mockedClassesCountEq).toHaveBeenCalledWith("teacher_id", "user-2");
    expect(mockedExamsCountEq).toHaveBeenCalledWith("created_by", "user-2");
    expect(mockedQuestionBankItemsCountEq).toHaveBeenCalledWith("created_by", "user-2");
  });
});
