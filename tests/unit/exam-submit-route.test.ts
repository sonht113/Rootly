import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedRevalidatePath,
  mockedGetCurrentProfile,
  mockedSubmitExamAttempt,
} = vi.hoisted(() => ({
  mockedRevalidatePath: vi.fn(),
  mockedGetCurrentProfile: vi.fn(),
  mockedSubmitExamAttempt: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockedRevalidatePath,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: mockedGetCurrentProfile,
}));

vi.mock("@/server/repositories/exams-repository", () => ({
  submitExamAttempt: mockedSubmitExamAttempt,
}));

import { POST } from "@/app/api/exams/attempts/[attemptId]/submit/route";

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const QUESTION_ID = "22222222-2222-4222-8222-222222222222";

describe("POST /api/exams/attempts/[attemptId]/submit", () => {
  beforeEach(() => {
    mockedRevalidatePath.mockReset();
    mockedGetCurrentProfile.mockReset();
    mockedSubmitExamAttempt.mockReset();

    mockedGetCurrentProfile.mockResolvedValue({
      auth_user_id: "user-1",
    });
    mockedSubmitExamAttempt.mockResolvedValue({
      attemptId: ATTEMPT_ID,
      examId: "33333333-3333-4333-8333-333333333333",
      status: "submitted",
      submittedAt: "2026-04-15T03:00:00.000Z",
      score: 80,
      awardedPoints: 8,
      totalPoints: 10,
      correctAnswers: 4,
      totalQuestions: 5,
      durationSeconds: 420,
    });
  });

  it("submits the attempt and revalidates ranking-related pages", async () => {
    const response = await POST(
      new Request("http://localhost/api/exams/attempts/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: [{ questionId: QUESTION_ID, userAnswer: "answer-a" }],
        }),
      }),
      {
        params: Promise.resolve({ attemptId: ATTEMPT_ID }),
      },
    );

    const result = (await response.json()) as {
      status: string;
      score: number;
      examId: string;
    };

    expect(response.status).toBe(200);
    expect(result.status).toBe("submitted");
    expect(result.score).toBe(80);
    expect(mockedSubmitExamAttempt).toHaveBeenCalledWith(ATTEMPT_ID, [
      {
        questionId: QUESTION_ID,
        userAnswer: "answer-a",
      },
    ]);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/exams");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/ranking");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(`/exams/${result.examId}`);
  });
});
