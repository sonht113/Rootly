import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedRevalidatePath,
  mockedGetCurrentProfile,
  mockedCreateQuestionBankItems,
} = vi.hoisted(() => ({
  mockedRevalidatePath: vi.fn(),
  mockedGetCurrentProfile: vi.fn(),
  mockedCreateQuestionBankItems: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockedRevalidatePath,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: mockedGetCurrentProfile,
}));

vi.mock("@/server/repositories/exams-repository", () => ({
  createQuestionBankItems: mockedCreateQuestionBankItems,
}));

import { POST } from "@/app/api/exams/question-bank/commit/route";

const EXAM_ID = "11111111-1111-4111-8111-111111111111";

const IMPORT_QUESTION = {
  question_type: "multiple_choice" as const,
  prompt: "Root spect is closest to which meaning?",
  correct_answer: "look",
  explanation: "spect relates to looking or seeing.",
  option_a: "look",
  option_b: "write",
  option_c: "carry",
  option_d: "say",
};

describe("POST /api/exams/question-bank/commit", () => {
  beforeEach(() => {
    mockedRevalidatePath.mockReset();
    mockedGetCurrentProfile.mockReset();
    mockedCreateQuestionBankItems.mockReset();

    mockedGetCurrentProfile.mockResolvedValue({
      auth_user_id: "teacher-1",
      role: "teacher",
    });
    mockedCreateQuestionBankItems.mockResolvedValue([
      {
        id: "22222222-2222-4222-8222-222222222222",
        created_by: "teacher-1",
        ...IMPORT_QUESTION,
        created_at: "2026-04-15T03:00:00.000Z",
        updated_at: "2026-04-15T03:00:00.000Z",
      },
    ]);
  });

  it("creates question bank items and revalidates teacher exam pages", async () => {
    const response = await POST(
      new Request("http://localhost/api/exams/question-bank/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId: EXAM_ID,
          selectedQuestionCount: 2,
          questions: [IMPORT_QUESTION],
        }),
      }),
    );

    const result = (await response.json()) as {
      importedCount: number;
      items: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(result.importedCount).toBe(1);
    expect(result.items[0]?.id).toBe("22222222-2222-4222-8222-222222222222");
    expect(mockedCreateQuestionBankItems).toHaveBeenCalledWith([IMPORT_QUESTION]);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teacher/exams");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(`/teacher/exams/${EXAM_ID}`);
  });

  it("rejects imports that would overflow the draft exam question limit", async () => {
    const response = await POST(
      new Request("http://localhost/api/exams/question-bank/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId: EXAM_ID,
          selectedQuestionCount: 50,
          questions: [IMPORT_QUESTION],
        }),
      }),
    );

    const result = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(result.message).toContain("tối đa 50 câu hỏi");
    expect(mockedCreateQuestionBankItems).not.toHaveBeenCalled();
  });
});
