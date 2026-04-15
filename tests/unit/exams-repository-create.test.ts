import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRandomUUID,
  mockManagedClassLookup,
  mockExamInsert,
  mockGetUser,
} = vi.hoisted(() => ({
  mockRandomUUID: vi.fn(),
  mockManagedClassLookup: vi.fn(),
  mockExamInsert: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();

  return {
    ...actual,
    default: actual,
    randomUUID: mockRandomUUID,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === "classes") {
        const query = {
          eq: () => query,
          maybeSingle: mockManagedClassLookup,
        };

        return {
          select: () => query,
        };
      }

      if (table === "exams") {
        return {
          insert: mockExamInsert,
        };
      }

      throw new Error(`Unexpected table mock: ${table}`);
    },
  })),
}));

import { createExam } from "@/server/repositories/exams-repository";

describe("exams repository createExam", () => {
  beforeEach(() => {
    mockRandomUUID.mockReset();
    mockManagedClassLookup.mockReset();
    mockExamInsert.mockReset();
    mockGetUser.mockReset();

    mockRandomUUID.mockReturnValue("exam-uuid-1");
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "teacher-1",
        },
      },
      error: null,
    });
    mockManagedClassLookup.mockResolvedValue({
      data: { id: "class-1" },
      error: null,
    });
    mockExamInsert.mockResolvedValue({
      error: null,
    });
  });

  it("creates a class-scoped exam after verifying class access and returns the generated id", async () => {
    const result = await createExam({
      title: "Kiem tra tuan 2",
      description: "Hello",
      scope: "class",
      classId: "class-1",
      startsAt: null,
      endsAt: null,
      durationMinutes: null,
    });

    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    expect(mockManagedClassLookup).toHaveBeenCalledTimes(1);
    expect(mockExamInsert).toHaveBeenCalledWith({
      id: result.id,
      title: "Kiem tra tuan 2",
      description: "Hello",
      scope: "class",
      class_id: "class-1",
      starts_at: null,
      ends_at: null,
      duration_minutes: null,
      created_by: "teacher-1",
    });
  });

  it("refuses to create a class-scoped exam when the current user cannot manage the class", async () => {
    mockManagedClassLookup.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      createExam({
        title: "Kiem tra lop",
        description: null,
        scope: "class",
        classId: "class-1",
        startsAt: null,
        endsAt: null,
        durationMinutes: 30,
      }),
    ).rejects.toThrow("Ban khong co quyen tao ky thi cho lop nay.");

    expect(mockExamInsert).not.toHaveBeenCalled();
  });

  it("creates a global exam without querying class access", async () => {
    const result = await createExam({
      title: "Kiem tra toan he thong",
      description: null,
      scope: "global",
      classId: null,
      startsAt: null,
      endsAt: null,
      durationMinutes: null,
    });

    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    expect(mockManagedClassLookup).not.toHaveBeenCalled();
    expect(mockExamInsert).toHaveBeenCalledWith({
      id: result.id,
      title: "Kiem tra toan he thong",
      description: null,
      scope: "global",
      class_id: null,
      starts_at: null,
      ends_at: null,
      duration_minutes: null,
      created_by: "teacher-1",
    });
  });
});
