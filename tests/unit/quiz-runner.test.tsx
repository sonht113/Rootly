import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedPush, mockedRefresh, mockedToastSuccess, mockedToastError } = vi.hoisted(() => ({
  mockedPush: vi.fn(),
  mockedRefresh: vi.fn(),
  mockedToastSuccess: vi.fn(),
  mockedToastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockedPush,
    refresh: mockedRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockedToastSuccess,
    error: mockedToastError,
  },
}));

import { QuizRunner } from "@/features/quiz/components/quiz-runner";
import type { QuizQuestion } from "@/types/domain";

const questions: QuizQuestion[] = [
  {
    id: "question-1",
    quizSetId: "quiz-set-1",
    questionType: "multiple_choice",
    prompt: "Root \"spect\" gần nhất với nghĩa nào?",
    correctAnswer: "nhìn; xem",
    options: ["nhìn; xem", "nói; ra lệnh", "viết", "mang; vận chuyển"],
  },
  {
    id: "question-2",
    quizSetId: "quiz-set-1",
    questionType: "text",
    prompt: "Điền từ còn thiếu: Please _____ the report before sending it.",
    correctAnswer: "inspect",
  },
];

describe("QuizRunner", () => {
  beforeEach(() => {
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    mockedToastSuccess.mockReset();
    mockedToastError.mockReset();
    global.fetch = vi.fn();
  });

  it("requires checking an answer before allowing the learner to continue", async () => {
    const user = userEvent.setup();

    render(<QuizRunner rootWordId="root-1" quizSetId="quiz-set-1" questions={questions} />);

    await user.click(screen.getByRole("button", { name: "nói; ra lệnh" }));

    expect(screen.queryByRole("button", { name: "Tiếp tục" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kiểm tra kết quả" }));

    expect(screen.getByRole("status")).toHaveTextContent("Chưa chính xác. Hãy thử đáp án khác.");
    expect(screen.getByRole("button", { name: "nói; ra lệnh" })).toHaveAttribute("data-feedback", "incorrect");
    expect(screen.queryByRole("button", { name: "Tiếp tục" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "nhìn; xem" }));

    expect(screen.getByRole("status")).toHaveTextContent("Chọn đáp án rồi nhấn Kiểm tra kết quả.");

    await user.click(screen.getByRole("button", { name: "Kiểm tra kết quả" }));

    expect(screen.getByRole("status")).toHaveTextContent("Chính xác. Bạn có thể tiếp tục sang câu tiếp theo.");
    expect(screen.getByRole("button", { name: "nhìn; xem" })).toHaveAttribute("data-feedback", "correct");
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeInTheDocument();
  });

  it("lets the learner retry a text answer and only submits when the last question is correct", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ attemptId: "attempt-1", correctAnswers: 2, totalQuestions: 2, score: 100 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<QuizRunner rootWordId="root-1" quizSetId="quiz-set-1" questions={questions} />);

    await user.click(screen.getByRole("button", { name: "nhìn; xem" }));
    await user.click(screen.getByRole("button", { name: "Kiểm tra kết quả" }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    const answerField = screen.getByRole("textbox");
    await user.type(answerField, "inspect report");
    await user.click(screen.getByRole("button", { name: "Kiểm tra kết quả" }));

    expect(answerField).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Chưa chính xác. Hãy chỉnh lại câu trả lời và kiểm tra lại.");
    expect(global.fetch).not.toHaveBeenCalled();

    await user.clear(answerField);
    await user.type(answerField, "  Inspect  ");
    await user.click(screen.getByRole("button", { name: "Kiểm tra kết quả" }));

    expect(answerField).toHaveAttribute("data-feedback", "correct");
    expect(screen.getByRole("status")).toHaveTextContent("Chính xác. Bạn có thể hoàn thành quiz.");

    await user.click(screen.getByRole("button", { name: "Hoàn thành quiz" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rootWordId: "root-1",
          quizSetId: "quiz-set-1",
          answers: [
            { questionId: "question-1", userAnswer: "nhìn; xem" },
            { questionId: "question-2", userAnswer: "  Inspect  " },
          ],
        }),
      });
      expect(mockedToastSuccess).toHaveBeenCalledWith("Bạn đã hoàn thành quiz. Hãy tiếp tục ôn tập để nhớ tốt hơn.");
      expect(mockedPush).toHaveBeenCalledWith("/roots/root-1");
      expect(mockedRefresh).toHaveBeenCalled();
    });
  });

  it("shows the completion sync toast when quiz submission also completes the active learning plan", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          attemptId: "attempt-1",
          correctAnswers: 2,
          totalQuestions: 2,
          score: 100,
          completedLearningPlan: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<QuizRunner rootWordId="root-1" quizSetId="quiz-set-1" questions={questions} />);

    await user.click(screen.getByRole("button", { name: "nhìn; xem" }));
    await user.click(screen.getByRole("button", { name: "Kiểm tra kết quả" }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    const answerField = screen.getByRole("textbox");
    await user.type(answerField, "inspect");
    await user.click(screen.getByRole("button", { name: "Kiểm tra kết quả" }));
    await user.click(screen.getByRole("button", { name: "Hoàn thành quiz" }));

    await waitFor(() => {
      expect(mockedToastSuccess).toHaveBeenCalledWith("Bạn đã hoàn thành quiz. Hãy tiếp tục ôn tập để nhớ tốt hơn.");
      expect(mockedToastSuccess).toHaveBeenCalledWith("Root word này đã được đánh dấu học xong và đưa vào chu kỳ ôn tập.");
      expect(mockedPush).toHaveBeenCalledWith("/roots/root-1");
    });
  });
});
