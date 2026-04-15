import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedRevalidatePath,
  mockedGetCurrentProfile,
  mockedSaveExamAttemptDraft,
} = vi.hoisted(() => ({
  mockedRevalidatePath: vi.fn(),
  mockedGetCurrentProfile: vi.fn(),
  mockedSaveExamAttemptDraft: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockedRevalidatePath,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: mockedGetCurrentProfile,
}));

vi.mock("@/server/repositories/exams-repository", () => ({
  saveExamAttemptDraft: mockedSaveExamAttemptDraft,
}));

import { POST } from "@/app/api/exams/attempts/[attemptId]/draft/route";

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const QUESTION_ID = "22222222-2222-4222-8222-222222222222";
const EXAM_ID = "33333333-3333-4333-8333-333333333333";

describe("POST /api/exams/attempts/[attemptId]/draft", () => {
  beforeEach(() => {
    mockedRevalidatePath.mockReset();
    mockedGetCurrentProfile.mockReset();
    mockedSaveExamAttemptDraft.mockReset();

    mockedGetCurrentProfile.mockResolvedValue({
      auth_user_id: "user-1",
    });
    mockedSaveExamAttemptDraft.mockResolvedValue({
      attemptId: ATTEMPT_ID,
      examId: EXAM_ID,
      status: "started",
      deadlineAt: "2026-04-15T04:00:00.000Z",
      remainingSeconds: 300,
      savedAnswerCount: 1,
      finalized: false,
      submittedAt: null,
      score: null,
      awardedPoints: null,
      totalPoints: null,
      correctAnswers: null,
      totalQuestions: null,
      durationSeconds: null,
    });
  });

  it("saves draft answers and revalidates the exam detail page", async () => {
    const response = await POST(
      new Request("http://localhost/api/exams/attempts/draft", {
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
      examId: string;
      finalized: boolean;
      savedAnswerCount: number;
    };

    expect(response.status).toBe(200);
    expect(result.finalized).toBe(false);
    expect(result.savedAnswerCount).toBe(1);
    expect(mockedSaveExamAttemptDraft).toHaveBeenCalledWith(ATTEMPT_ID, [
      {
        questionId: QUESTION_ID,
        userAnswer: "answer-a",
      },
    ]);
    expect(mockedRevalidatePath).toHaveBeenCalledWith(`/exams/${EXAM_ID}`);
    expect(mockedRevalidatePath).not.toHaveBeenCalledWith("/ranking");
  });

  it("revalidates exam list and ranking when draft save finalizes the attempt", async () => {
    mockedSaveExamAttemptDraft.mockResolvedValue({
      attemptId: ATTEMPT_ID,
      examId: EXAM_ID,
      status: "expired",
      deadlineAt: "2026-04-15T04:00:00.000Z",
      remainingSeconds: 0,
      savedAnswerCount: 0,
      finalized: true,
      submittedAt: "2026-04-15T04:00:00.000Z",
      score: 60,
      awardedPoints: 6,
      totalPoints: 10,
      correctAnswers: 3,
      totalQuestions: 5,
      durationSeconds: 900,
    });

    const response = await POST(
      new Request("http://localhost/api/exams/attempts/draft", {
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

    expect(response.status).toBe(200);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/exams");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/ranking");
  });
});
