"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { formatExamDuration, getExamAttemptRemainingSeconds } from "@/lib/utils/exams";
import type {
  ExamAttemptDraftSaveResult,
  ExamAttemptQuestion,
  ExamAttemptRuntimeState,
  ExamAttemptSubmissionResult,
  ExamSubmissionAnswer,
} from "@/types/domain";

interface ExamAttemptRunnerProps {
  examId: string;
  attemptId: string;
  questions: ExamAttemptQuestion[];
  initialAnswers: ExamSubmissionAnswer[];
  runtime: ExamAttemptRuntimeState | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

interface DraftResponse extends Partial<ExamAttemptDraftSaveResult> {
  message?: string;
}

interface SubmitResponse extends Partial<ExamAttemptSubmissionResult> {
  message?: string;
}

export function ExamAttemptRunner({
  examId,
  attemptId,
  questions,
  initialAnswers,
  runtime,
}: ExamAttemptRunnerProps) {
  const router = useRouter();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => buildAnswerMap(initialAnswers));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [lastSavedPayload, setLastSavedPayload] = useState(() =>
    serializeAnswers(buildSubmissionPayload(questions, buildAnswerMap(initialAnswers))),
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(runtime?.remainingSeconds ?? null);

  const answersRef = useRef(answers);
  const autoSaveTimerRef = useRef<number | null>(null);
  const finalizingRef = useRef(false);
  const lastSavedPayloadRef = useRef(lastSavedPayload);

  const submissionPayload = useMemo(() => buildSubmissionPayload(questions, answers), [answers, questions]);
  const serializedPayload = useMemo(() => serializeAnswers(submissionPayload), [submissionPayload]);
  const hasPendingChanges = serializedPayload !== lastSavedPayload;
  const question = questions[currentIndex];
  const currentAnswer = question ? answers[question.questionId] ?? "" : "";
  const isBusy = isSubmitting || isFinalizing;
  const effectiveRemainingSeconds = runtime?.deadlineAt ? remainingSeconds : null;

  const answeredCount = useMemo(
    () => questions.filter((entry) => (answers[entry.questionId] ?? "").trim().length > 0).length,
    [answers, questions],
  );
  const progress = useMemo(
    () => (questions.length > 0 ? (answeredCount / questions.length) * 100 : 0),
    [answeredCount, questions.length],
  );

  function setFinalizing(nextValue: boolean) {
    finalizingRef.current = nextValue;
    setIsFinalizing(nextValue);
  }

  function setSavedPayload(payloadKey: string) {
    lastSavedPayloadRef.current = payloadKey;
    setLastSavedPayload(payloadKey);
  }

  async function saveDraft({
    silent = false,
    allowWhileFinalizing = false,
  }: {
    silent?: boolean;
    allowWhileFinalizing?: boolean;
  } = {}) {
    if (finalizingRef.current && !allowWhileFinalizing) {
      return { ok: false, finalized: true };
    }

    const payload = buildSubmissionPayload(questions, answersRef.current);
    const payloadKey = serializeAnswers(payload);
    if (payloadKey === lastSavedPayloadRef.current) {
      return { ok: true, finalized: false };
    }

    setSaveState("saving");

    try {
      const response = await fetch(`/api/exams/attempts/${attemptId}/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers: payload }),
      });

      const result = (await response.json()) as DraftResponse;
      if (!response.ok) {
        setSaveState("error");
        if (!silent) {
          toast.error(result.message ?? "Không thể lưu nháp bài thi.");
        }
        if (response.status === 409) {
          setFinalizing(true);
          router.refresh();
          return { ok: false, finalized: true };
        }
        return { ok: false, finalized: false };
      }

      if (result.finalized) {
        setFinalizing(true);
        setSaveState("saved");
        setRemainingSeconds(0);
        toast.success(
          result.status === "expired"
            ? "Hết giờ làm bài. Hệ thống đã tự chốt bài của bạn."
            : "Bài thi đã được chốt.",
        );
        router.refresh();
        return { ok: true, finalized: true };
      }

      setSavedPayload(payloadKey);
      setLastSavedAt(Date.now());
      setSaveState("saved");
      return { ok: true, finalized: false };
    } catch (error) {
      setSaveState("error");
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu nháp bài thi.");
      }
      return { ok: false, finalized: false };
    }
  }

  const saveDraftEffect = useEffectEvent((options?: { silent?: boolean; allowWhileFinalizing?: boolean }) => {
    void saveDraft(options);
  });

  function finalizeAttempt(reason: "manual" | "timeout") {
    if (finalizingRef.current) {
      return;
    }

    setFinalizing(true);
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    startSubmitTransition(async () => {
      try {
        const saveResult = await saveDraft({ silent: reason === "timeout", allowWhileFinalizing: true });
        if (!saveResult.ok || saveResult.finalized) {
          if (!saveResult.ok && !saveResult.finalized) {
            setFinalizing(false);
          }
          return;
        }

        const payload = buildSubmissionPayload(questions, answersRef.current);
        const response = await fetch(`/api/exams/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: payload,
          }),
        });

        const result = (await response.json()) as SubmitResponse;
        if (!response.ok) {
          setFinalizing(false);
          toast.error(result.message ?? "Không thể nộp bài thi.");
          return;
        }

        setSaveState("saved");
        setSavedPayload(serializeAnswers(payload));
        setRemainingSeconds(0);
        toast.success(
          result.status === "expired"
            ? "Hết giờ làm bài. Hệ thống đã tự chốt bài của bạn."
            : `Đã nộp bài thi. Điểm của bạn: ${result.score ?? 0}%.`,
        );
        router.refresh();
      } catch (error) {
        setFinalizing(false);
        toast.error(error instanceof Error ? error.message : "Không thể nộp bài thi.");
      }
    });
  }

  const finalizeAttemptOnTimeout = useEffectEvent(() => {
    finalizeAttempt("timeout");
  });

  useEffect(() => {
    if (questions.length === 0) {
      return;
    }

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (!hasPendingChanges || isFinalizing) {
      return;
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      saveDraftEffect({ silent: true });
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [hasPendingChanges, isFinalizing, questions.length, serializedPayload]);

  useEffect(() => {
    const deadlineAt = runtime?.deadlineAt ?? null;
    if (!deadlineAt) {
      return;
    }

    const updateRemaining = () => {
      setRemainingSeconds(getExamAttemptRemainingSeconds({ deadlineAt }));
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [runtime?.deadlineAt]);

  useEffect(() => {
    if (!runtime?.deadlineAt || isFinalizing) {
      return;
    }

    if (effectiveRemainingSeconds !== null && effectiveRemainingSeconds <= 0) {
      finalizeAttemptOnTimeout();
    }
  }, [isFinalizing, effectiveRemainingSeconds, runtime?.deadlineAt]);

  if (questions.length === 0 || !question) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-[color:var(--muted-foreground)]">
          Bộ đề hiện chưa sẵn sàng. Hãy tải lại trang để đồng bộ trạng thái bài thi.
        </CardContent>
      </Card>
    );
  }

  function updateAnswer(questionId: string, nextAnswer: string) {
    if (isFinalizing) {
      return;
    }

    setAnswers((state) => {
      const nextState = {
        ...state,
        [questionId]: nextAnswer,
      };
      answersRef.current = nextState;
      return nextState;
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
              <span>
                Câu {currentIndex + 1}/{questions.length}
              </span>
              <span>|</span>
              <span>
                Đã trả lời {answeredCount}/{questions.length}
              </span>
            </div>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {getSaveStatusLabel(saveState, lastSavedAt, hasPendingChanges)}
            </p>
          </div>

          {runtime?.isTimed ? (
            <Badge
              variant={effectiveRemainingSeconds !== null && effectiveRemainingSeconds <= 60 ? "danger" : "warning"}
            >
              Con lai {formatExamDuration(effectiveRemainingSeconds ?? 0)}
            </Badge>
          ) : (
            <Badge variant="outline">Không giới hạn thời gian</Badge>
          )}
        </div>

        <Progress value={progress} />
        {runtime?.isTimed ? (
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Hệ thống sẽ tự lưu nháp trong quá trình làm bài và tự chốt bài khi hết giờ.
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-xl">{question.prompt}</CardTitle>
            <Badge variant="outline">{question.points} điểm</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.options && question.options.length > 0 ? (
            <div className="grid gap-3">
              {question.options.map((option) => {
                const isSelected = currentAnswer === option;

                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-[14px] border px-4 py-3 text-left text-sm transition",
                      isSelected
                        ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]"
                        : "border-[color:var(--border)] bg-white hover:border-[color:var(--primary)]/40",
                    )}
                    disabled={isBusy}
                    onClick={() => updateAnswer(question.questionId, option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : (
            <Textarea
              className="min-h-[140px] rounded-[14px] p-3"
              placeholder="Nhập câu trả lời của bạn"
              disabled={isBusy}
              value={currentAnswer}
              onChange={(event) => updateAnswer(question.questionId, event.target.value)}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={currentIndex === 0 || isBusy}
          onClick={() => setCurrentIndex((value) => value - 1)}
        >
          Quay lại
        </Button>

        {currentIndex === questions.length - 1 ? (
          <Button type="button" variant="accent" disabled={isBusy} onClick={() => finalizeAttempt("manual")}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Nộp bài thi
          </Button>
        ) : (
          <Button type="button" disabled={isBusy} onClick={() => setCurrentIndex((value) => value + 1)}>
            Tiếp tục
          </Button>
        )}
      </div>

      <p className="text-xs text-[color:var(--muted-foreground)]">
        Mã lượt làm bài: {attemptId.slice(0, 8)} | Kỳ thi: {examId.slice(0, 8)}
      </p>
    </div>
  );
}

function buildAnswerMap(answers: ExamSubmissionAnswer[]) {
  return answers.reduce<Record<string, string>>((state, answer) => {
    state[answer.questionId] = answer.userAnswer;
    return state;
  }, {});
}

function buildSubmissionPayload(questions: ExamAttemptQuestion[], answers: Record<string, string>): ExamSubmissionAnswer[] {
  return questions.map((question) => ({
    questionId: question.questionId,
    userAnswer: answers[question.questionId] ?? "",
  }));
}

function serializeAnswers(answers: ExamSubmissionAnswer[]) {
  return JSON.stringify(answers);
}

function getSaveStatusLabel(saveState: SaveState, lastSavedAt: number | null, hasPendingChanges: boolean) {
  if (saveState === "saving") {
    return "Đang lưu nháp tự động...";
  }

  if (hasPendingChanges) {
    return "Có thay đổi chưa được lưu nháp.";
  }

  if (saveState === "error") {
    return "Chưa thể lưu nháp. Hãy kiểm tra kết nối và thử lại.";
  }

  if (lastSavedAt) {
    return `Đã lưu nháp lúc ${new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(lastSavedAt))}.`;
  }

  return "Câu trả lời sẽ được tự động lưu nháp trong quá trình làm bài.";
}
