import { describe, expect, it } from "vitest";

import { buildQuizQuestions, isQuizAnswerCorrect, scoreQuizAnswers } from "@/server/services/quiz-service";
import type { RootWordQuizSetDetail } from "@/types/domain";

const quizSetFixture: RootWordQuizSetDetail = {
  id: "quiz-set-1",
  root_word_id: "root-1",
  question_count: 2,
  created_by: "user-1",
  created_at: "2026-04-10T00:00:00.000Z",
  updated_at: "2026-04-10T00:00:00.000Z",
  questions: [
    {
      id: "question-1",
      quiz_set_id: "quiz-set-1",
      position: 1,
      question_type: "multiple_choice",
      prompt: "Root \"spect\" gần nhất với nghĩa nào?",
      correct_answer: "nhìn; xem",
      explanation: "spect liên quan đến nhìn.",
      option_a: "nhìn; xem",
      option_b: "nói; ra lệnh",
      option_c: "viết",
      option_d: "mang; vận chuyển",
      created_at: "2026-04-10T00:00:00.000Z",
    },
    {
      id: "question-2",
      quiz_set_id: "quiz-set-1",
      position: 2,
      question_type: "text",
      prompt: "Điền từ còn thiếu: Please _____ the report before sending it.",
      correct_answer: "inspect",
      explanation: "inspect là đáp án phù hợp.",
      option_a: null,
      option_b: null,
      option_c: null,
      option_d: null,
      created_at: "2026-04-10T00:00:00.000Z",
    },
  ],
};

describe("quiz service", () => {
  it("maps imported quiz questions into runner-ready questions", () => {
    const questions = buildQuizQuestions(quizSetFixture);

    expect(questions).toHaveLength(2);
    expect(questions[0]).toEqual({
      id: "question-1",
      quizSetId: "quiz-set-1",
      questionType: "multiple_choice",
      prompt: "Root \"spect\" gần nhất với nghĩa nào?",
      correctAnswer: "nhìn; xem",
      options: ["nhìn; xem", "nói; ra lệnh", "viết", "mang; vận chuyển"],
    });
    expect(questions[1]?.correctAnswer).toBe("inspect");
    expect(questions[1]?.options).toBeUndefined();
  });

  it("compares answers with normalized casing and whitespace", () => {
    expect(isQuizAnswerCorrect("  Inspect  ", "inspect")).toBe(true);
    expect(isQuizAnswerCorrect("inspect report", "inspect")).toBe(false);
  });

  it("scores quiz answers as percentage", () => {
    const result = scoreQuizAnswers([
      { questionId: "q1", userAnswer: "a", isCorrect: true },
      { questionId: "q2", userAnswer: "x", isCorrect: false },
    ]);

    expect(result.correctAnswers).toBe(1);
    expect(result.totalQuestions).toBe(2);
    expect(result.score).toBe(50);
  });
});
