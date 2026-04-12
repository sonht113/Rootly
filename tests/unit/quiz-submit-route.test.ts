import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedRevalidatePath,
  mockedCreateServerSupabaseClient,
  mockedGetQuizSetForSubmission,
  mockedCompleteNearestActiveStudyPlanForRootWord,
  mockedIsQuizAnswerCorrect,
  mockedScoreQuizAnswers,
} = vi.hoisted(() => ({
  mockedRevalidatePath: vi.fn(),
  mockedCreateServerSupabaseClient: vi.fn(),
  mockedGetQuizSetForSubmission: vi.fn(),
  mockedCompleteNearestActiveStudyPlanForRootWord: vi.fn(),
  mockedIsQuizAnswerCorrect: vi.fn(),
  mockedScoreQuizAnswers: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockedRevalidatePath,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockedCreateServerSupabaseClient,
}));

vi.mock("@/server/repositories/root-word-quizzes-repository", () => ({
  getQuizSetForSubmission: mockedGetQuizSetForSubmission,
}));

vi.mock("@/server/repositories/study-repository", () => ({
  completeNearestActiveStudyPlanForRootWord: mockedCompleteNearestActiveStudyPlanForRootWord,
}));

vi.mock("@/server/services/quiz-service", () => ({
  isQuizAnswerCorrect: mockedIsQuizAnswerCorrect,
  scoreQuizAnswers: mockedScoreQuizAnswers,
}));

import { POST } from "@/app/api/quiz/submit/route";

const ROOT_WORD_ID = "11111111-1111-4111-8111-111111111111";
const QUIZ_SET_ID = "22222222-2222-4222-8222-222222222222";
const QUESTION_ID = "33333333-3333-4333-8333-333333333333";

describe("POST /api/quiz/submit", () => {
  beforeEach(() => {
    mockedRevalidatePath.mockReset();
    mockedGetQuizSetForSubmission.mockReset();
    mockedCompleteNearestActiveStudyPlanForRootWord.mockReset();
    mockedIsQuizAnswerCorrect.mockReset();
    mockedScoreQuizAnswers.mockReset();

    mockedGetQuizSetForSubmission.mockResolvedValue({
      id: QUIZ_SET_ID,
      questions: [
        {
          id: QUESTION_ID,
          question_type: "multiple_choice",
          prompt: "Question 1",
          correct_answer: "answer-a",
        },
      ],
    });
    mockedCompleteNearestActiveStudyPlanForRootWord.mockResolvedValue({
      completed: true,
      planId: "plan-1",
    });
    mockedIsQuizAnswerCorrect.mockImplementation((userAnswer: string, correctAnswer: string) => userAnswer === correctAnswer);
    mockedScoreQuizAnswers.mockReturnValue({
      score: 100,
      correctAnswers: 1,
      totalQuestions: 1,
    });

    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-1" },
          },
        }),
      },
      from: (table: string) => {
        if (table === "quiz_attempts") {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: "attempt-1" },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "quiz_answers") {
          return {
            insert: async () => ({
              error: null,
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    });
  });

  it("revalidates calendar when quiz completion also completes the active plan", async () => {
    const response = await POST(
      new Request("http://localhost/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rootWordId: ROOT_WORD_ID,
          quizSetId: QUIZ_SET_ID,
          answers: [{ questionId: QUESTION_ID, userAnswer: "answer-a" }],
        }),
      }),
    );

    const result = (await response.json()) as {
      completedLearningPlan?: boolean;
      correctAnswers?: number;
      totalQuestions?: number;
    };

    expect(response.status).toBe(200);
    expect(result.completedLearningPlan).toBe(true);
    expect(result.correctAnswers).toBe(1);
    expect(result.totalQuestions).toBe(1);
    expect(mockedCompleteNearestActiveStudyPlanForRootWord).toHaveBeenCalledWith(ROOT_WORD_ID);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/calendar");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/reviews");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(`/library/${ROOT_WORD_ID}`);
    expect(mockedRevalidatePath).toHaveBeenCalledWith(`/roots/${ROOT_WORD_ID}`);
  });
});
