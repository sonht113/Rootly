"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import type { QuizQuestion } from "@/types/domain";

interface QuizRunnerProps {
  rootWordId: string;
  quizSetId: string;
  questions: QuizQuestion[];
}

export function QuizRunner({ rootWordId, quizSetId, questions }: QuizRunnerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const question = questions[currentIndex];

  const progress = useMemo(() => ((currentIndex + 1) / questions.length) * 100, [currentIndex, questions.length]);
  const answeredCount = useMemo(
    () => questions.filter((entry) => (answers[entry.id] ?? "").trim().length > 0).length,
    [answers, questions],
  );

  function handleSubmitQuiz() {
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
      };

      if (!response.ok) {
        toast.error(result.message ?? "Không thể nộp bài quiz.");
        return;
      }

      toast.success(
        `Đã lưu kết quả quiz: ${result.correctAnswers ?? 0}/${result.totalQuestions ?? questions.length} câu đúng (${result.score ?? 0}%).`,
      );
      router.push(`/roots/${rootWordId}`);
      router.refresh();
    });
  }

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
        <p className="text-xs text-[color:var(--muted-foreground)]">Đã trả lời {answeredCount}/{questions.length} câu.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{question.prompt}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.options && question.options.length > 0 ? (
            <div className="grid gap-3">
              {question.options.map((option) => {
                const isSelected = answers[question.id] === option;

                return (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      "rounded-[14px] border px-4 py-3 text-left text-sm transition",
                      isSelected
                        ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]"
                        : "border-[color:var(--border)] bg-white",
                    )}
                    onClick={() => setAnswers((state) => ({ ...state, [question.id]: option }))}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              className="min-h-[120px] w-full rounded-[14px] border border-[color:var(--border)] p-3 text-sm"
              value={answers[question.id] ?? ""}
              onChange={(event) => setAnswers((state) => ({ ...state, [question.id]: event.target.value }))}
              placeholder="Nhập câu trả lời của bạn"
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => value - 1)}>
          Quay lại
        </Button>
        {currentIndex === questions.length - 1 ? (
          <Button type="button" variant="accent" disabled={isPending} onClick={handleSubmitQuiz}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Nộp bài
          </Button>
        ) : (
          <Button type="button" onClick={() => setCurrentIndex((value) => value + 1)}>
            Tiếp tục
          </Button>
        )}
      </div>
    </div>
  );
}
