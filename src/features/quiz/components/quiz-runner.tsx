"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { isQuizAnswerCorrect } from "@/lib/utils/quiz";
import type { QuizQuestion } from "@/types/domain";

interface QuizRunnerProps {
  rootWordId: string;
  quizSetId: string;
  questions: QuizQuestion[];
}

type QuestionStatus = "idle" | "incorrect" | "correct";

interface QuestionState {
  status: QuestionStatus;
  checkedAnswer?: string;
}

export function QuizRunner({ rootWordId, quizSetId, questions }: QuizRunnerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const question = questions[currentIndex];
  const questionState = questionStates[question.id] ?? { status: "idle" as const };
  const currentAnswer = answers[question.id] ?? "";

  const completedCount = useMemo(
    () => questions.filter((entry) => questionStates[entry.id]?.status === "correct").length,
    [questionStates, questions],
  );
  const progress = useMemo(
    () => (questions.length > 0 ? (completedCount / questions.length) * 100 : 0),
    [completedCount, questions.length],
  );
  const canCheckCurrentAnswer = currentAnswer.trim().length > 0 && questionState.status !== "correct" && !isPending;

  function updateAnswer(questionId: string, nextAnswer: string) {
    setAnswers((state) => ({ ...state, [questionId]: nextAnswer }));
    setQuestionStates((state) => {
      const currentState = state[questionId];
      if (!currentState || currentState.status === "idle" || currentState.status === "correct") {
        return state;
      }

      return {
        ...state,
        [questionId]: { status: "idle" },
      };
    });
  }

  function handleCheckAnswer() {
    if (!canCheckCurrentAnswer) {
      return;
    }

    const isCorrect = isQuizAnswerCorrect(currentAnswer, question.correctAnswer);
    setQuestionStates((state) => ({
      ...state,
      [question.id]: {
        status: isCorrect ? "correct" : "incorrect",
        checkedAnswer: question.questionType === "multiple_choice" ? currentAnswer : undefined,
      },
    }));
  }

  function handleNextQuestion() {
    if (questionState.status !== "correct" || currentIndex >= questions.length - 1) {
      return;
    }

    setCurrentIndex((value) => value + 1);
  }

  function handleSubmitQuiz() {
    if (questions.some((entry) => questionStates[entry.id]?.status !== "correct")) {
      toast.error("Hãy kiểm tra đúng từng câu trước khi hoàn thành quiz.");
      return;
    }

    startTransition(async () => {
      const payload = {
        rootWordId,
        quizSetId,
        answers: questions.map((entry) => ({
          questionId: entry.id,
          userAnswer: answers[entry.id] ?? "",
        })),
      };

      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        message?: string;
        correctAnswers?: number;
        totalQuestions?: number;
        score?: number;
        completedLearningPlan?: boolean;
        reviewCycleCreated?: boolean;
        learningPlanSyncError?: string | null;
      };

      if (!response.ok) {
        toast.error(result.message ?? "Không thể lưu kết quả quiz.");
        return;
      }

      toast.success("Bạn đã hoàn thành quiz. Hãy tiếp tục ôn tập để nhớ tốt hơn.");
      if (result.completedLearningPlan || result.reviewCycleCreated) {
        toast.success("Root word này đã được đánh dấu học xong và đưa vào chu kỳ ôn tập.");
      }
      if (result.learningPlanSyncError) {
        toast.error(result.learningPlanSyncError);
      }

      router.push(`/roots/${rootWordId}`);
      router.refresh();
    });
  }

  const statusMessage =
    questionState.status === "correct"
      ? currentIndex === questions.length - 1
        ? "Chính xác. Bạn có thể hoàn thành quiz."
        : "Chính xác. Bạn có thể tiếp tục sang câu tiếp theo."
      : questionState.status === "incorrect"
        ? question.questionType === "text"
          ? "Chưa chính xác. Hãy chỉnh lại câu trả lời và kiểm tra lại."
          : "Chưa chính xác. Hãy thử đáp án khác."
        : question.questionType === "text"
          ? "Nhập câu trả lời rồi nhấn Kiểm tra kết quả."
          : "Chọn đáp án rồi nhấn Kiểm tra kết quả.";

  const statusBadgeVariant =
    questionState.status === "correct" ? "success" : questionState.status === "incorrect" ? "danger" : "outline";
  const statusBadgeLabel =
    questionState.status === "correct"
      ? "Chính xác"
      : questionState.status === "incorrect"
        ? "Thử lại"
        : "Chưa kiểm tra";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-[color:var(--muted-foreground)]">
          <span>
            Câu {currentIndex + 1}/{questions.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Đã hoàn thành {completedCount}/{questions.length} câu.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-xl">{question.prompt}</CardTitle>
            <Badge variant={statusBadgeVariant}>{statusBadgeLabel}</Badge>
          </div>
          <p
            className={cn(
              "text-sm",
              questionState.status === "correct"
                ? "text-[color:var(--success-strong)]"
                : questionState.status === "incorrect"
                  ? "text-[color:var(--danger)]"
                  : "text-[color:var(--muted-foreground)]",
            )}
            role="status"
          >
            {statusMessage}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.options && question.options.length > 0 ? (
            <div className="grid gap-3">
              {question.options.map((option) => {
                const isSelected = currentAnswer === option;
                const isIncorrectOption = questionState.status === "incorrect" && questionState.checkedAnswer === option;
                const isCorrectOption = questionState.status === "correct" && questionState.checkedAnswer === option;
                const feedbackState = isCorrectOption ? "correct" : isIncorrectOption ? "incorrect" : isSelected ? "selected" : "idle";

                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-[14px] border px-4 py-3 text-left text-sm transition",
                      isCorrectOption
                        ? "border-[color:var(--success)] bg-[color:var(--success-soft)] text-[color:var(--success-strong)]"
                        : isIncorrectOption
                          ? "border-[color:var(--danger)] bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                          : isSelected
                            ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]"
                            : "border-[color:var(--border)] bg-white hover:border-[color:var(--primary)]/40",
                    )}
                    data-feedback={feedbackState}
                    disabled={questionState.status === "correct"}
                    onClick={() => updateAnswer(question.id, option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              aria-invalid={questionState.status === "incorrect"}
              className={cn(
                "min-h-[120px] w-full rounded-[14px] border p-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
                questionState.status === "correct"
                  ? "border-[color:var(--success)] bg-[color:var(--success-soft)] text-[color:var(--success-strong)]"
                  : questionState.status === "incorrect"
                    ? "border-[color:var(--danger)] bg-[color:var(--danger-soft)] text-[color:var(--foreground)]"
                    : "border-[color:var(--border)] bg-white",
              )}
              data-feedback={questionState.status}
              placeholder="Nhập câu trả lời của bạn"
              readOnly={questionState.status === "correct"}
              value={currentAnswer}
              onChange={(event) => updateAnswer(question.id, event.target.value)}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={currentIndex === 0 || isPending}
          onClick={() => setCurrentIndex((value) => value - 1)}
        >
          Quay lại
        </Button>
        {questionState.status === "correct" ? (
          currentIndex === questions.length - 1 ? (
            <Button type="button" variant="accent" disabled={isPending} onClick={handleSubmitQuiz}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Hoàn thành quiz
            </Button>
          ) : (
            <Button type="button" onClick={handleNextQuestion}>
              Tiếp tục
            </Button>
          )
        ) : (
          <Button type="button" variant="accent" disabled={!canCheckCurrentAnswer} onClick={handleCheckAnswer}>
            Kiểm tra kết quả
          </Button>
        )}
      </div>
    </div>
  );
}
