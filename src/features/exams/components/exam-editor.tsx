"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Loader2, PlusCircle, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  closeExamAction,
  publishExamAction,
  syncExamQuestionsAction,
  updateExamAction,
} from "@/features/exams/actions/exams";
import { ExamQuestionBankImportDialog } from "@/features/exams/components/exam-question-bank-import-dialog";
import { formatExamWindow, getExamScopeLabel, getExamStatusLabel, toDateTimeLocalValue } from "@/lib/utils/exams";
import { updateExamSchema } from "@/lib/validations/exams";
import type { ExamQuestionBankItemRow, ExamQuestionRow, QuizQuestionType } from "@/types/domain";

type UpdateExamFormValues = z.input<typeof updateExamSchema>;

interface ExamEditorProps {
  exam: {
    id: string;
    title: string;
    description: string | null;
    scope: "class" | "global";
    class_id: string | null;
    class_name: string | null;
    status: "draft" | "published" | "closed";
    starts_at: string | null;
    ends_at: string | null;
    duration_minutes: number | null;
    question_count: number;
    total_points: number;
  };
  questions: ExamQuestionRow[];
  questionBankItems: ExamQuestionBankItemRow[];
  classes: Array<{
    id: string;
    name: string;
  }>;
}

interface SelectedExamQuestion {
  questionBankItemId: string;
  prompt: string;
  questionType: QuizQuestionType;
  points: number;
}

function toSelectedExamQuestion(question: ExamQuestionRow & { question_bank_item_id: string }) {
  return {
    questionBankItemId: question.question_bank_item_id,
    prompt: question.prompt,
    questionType: question.question_type,
    points: question.points,
  };
}

function prependUniqueQuestionBankItems(current: ExamQuestionBankItemRow[], incoming: ExamQuestionBankItemRow[]) {
  const seen = new Set(current.map((item) => item.id));
  const nextItems = incoming.filter((item) => !seen.has(item.id));
  return [...nextItems, ...current];
}

function appendImportedItemsToSelection(current: SelectedExamQuestion[], incoming: ExamQuestionBankItemRow[]) {
  const seen = new Set(current.map((question) => question.questionBankItemId));
  const importedQuestions = incoming
    .filter((item) => !seen.has(item.id))
    .map((item) => ({
      questionBankItemId: item.id,
      prompt: item.prompt,
      questionType: item.question_type,
      points: 1,
    }));

  return [...current, ...importedQuestions];
}

export function ExamEditor({ exam, questions, questionBankItems, classes }: ExamEditorProps) {
  const router = useRouter();
  const [isSavingQuestions, startSavingQuestions] = useTransition();
  const [isChangingStatus, startChangingStatus] = useTransition();
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedExamQuestion[]>(
    questions
      .filter((question): question is ExamQuestionRow & { question_bank_item_id: string } => Boolean(question.question_bank_item_id))
      .map(toSelectedExamQuestion),
  );
  const [availableQuestionBankItems, setAvailableQuestionBankItems] = useState(questionBankItems);
  const isDraft = exam.status === "draft";
  const bankItemsById = useMemo(
    () => new Map(availableQuestionBankItems.map((item) => [item.id, item])),
    [availableQuestionBankItems],
  );
  const form = useForm<UpdateExamFormValues>({
    resolver: zodResolver(updateExamSchema),
    defaultValues: {
      examId: exam.id,
      title: exam.title,
      description: exam.description ?? "",
      scope: exam.scope,
      classId: exam.class_id,
      startsAt: toDateTimeLocalValue(exam.starts_at) || null,
      endsAt: toDateTimeLocalValue(exam.ends_at) || null,
      durationMinutes: exam.duration_minutes,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startSavingQuestions(async () => {
      try {
        await updateExamAction(values);
        toast.success("Đã cập nhật thông tin kỳ thi.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể cập nhật kỳ thi.");
      }
    });
  });

  function addQuestion(item: ExamQuestionBankItemRow) {
    setSelectedQuestions((current) => {
      if (current.some((question) => question.questionBankItemId === item.id)) {
        return current;
      }

      return [
        ...current,
        {
          questionBankItemId: item.id,
          prompt: item.prompt,
          questionType: item.question_type,
          points: 1,
        },
      ];
    });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setSelectedQuestions((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function removeQuestion(questionBankItemId: string) {
    setSelectedQuestions((current) => current.filter((question) => question.questionBankItemId !== questionBankItemId));
  }

  function updateQuestionPoints(questionBankItemId: string, value: string) {
    const parsed = Number(value);
    setSelectedQuestions((current) =>
      current.map((question) =>
        question.questionBankItemId === questionBankItemId
          ? {
              ...question,
              points: Number.isFinite(parsed) && parsed >= 1 ? Math.min(20, Math.round(parsed)) : 1,
            }
          : question,
      ),
    );
  }

  function handleSyncQuestions() {
    if (!isDraft) {
      return;
    }

    startSavingQuestions(async () => {
      try {
        await syncExamQuestionsAction({
          examId: exam.id,
          questions: selectedQuestions.map((question) => ({
            questionBankItemId: question.questionBankItemId,
            points: question.points,
          })),
        });
        toast.success("Đã đồng bộ bộ câu hỏi của kỳ thi.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu bộ câu hỏi.");
      }
    });
  }

  function handlePublish() {
    startChangingStatus(async () => {
      try {
        await publishExamAction({ examId: exam.id });
        toast.success("Đã phát hành kỳ thi.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể phát hành kỳ thi.");
      }
    });
  }

  function handleClose() {
    startChangingStatus(async () => {
      try {
        await closeExamAction({ examId: exam.id });
        toast.success("Đã đóng kỳ thi.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể đóng kỳ thi.");
      }
    });
  }

  function handleImportedItems(items: ExamQuestionBankItemRow[]) {
    setAvailableQuestionBankItems((current) => prependUniqueQuestionBankItems(current, items));
    setSelectedQuestions((current) => appendImportedItemsToSelection(current, items));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{exam.title}</CardTitle>
              <Badge variant={exam.status === "draft" ? "outline" : exam.status === "closed" ? "danger" : "success"}>
                {getExamStatusLabel(exam.status)}
              </Badge>
              <Badge variant="outline">{getExamScopeLabel(exam.scope)}</Badge>
            </div>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {exam.class_name ? `${exam.class_name} · ` : ""}
              {formatExamWindow(exam.starts_at, exam.ends_at)}
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <input type="hidden" {...form.register("examId")} />

              <div className="space-y-2">
                <Label>Tên kỳ thi</Label>
                <Input {...form.register("title")} disabled={!isDraft || isSavingQuestions} />
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea {...form.register("description")} disabled={!isDraft || isSavingQuestions} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phạm vi</Label>
                  <select
                    className="h-10 w-full rounded-[12px] border border-[color:var(--border)] bg-white px-3 text-sm"
                    value={form.watch("scope")}
                    disabled={!isDraft || isSavingQuestions}
                    onChange={(event) => {
                      const nextScope = event.target.value as "class" | "global";
                      form.setValue("scope", nextScope);
                      if (nextScope === "global") {
                        form.setValue("classId", null);
                      } else if (!form.getValues("classId")) {
                        form.setValue("classId", classes[0]?.id ?? null);
                      }
                    }}
                  >
                    <option value="global">Toàn hệ thống</option>
                    <option value="class">Lớp học</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Lớp áp dụng</Label>
                  <select
                    className="h-10 w-full rounded-[12px] border border-[color:var(--border)] bg-white px-3 text-sm"
                    value={form.watch("classId") ?? ""}
                    disabled={!isDraft || isSavingQuestions || form.watch("scope") !== "class"}
                    onChange={(event) => form.setValue("classId", event.target.value || null)}
                  >
                    <option value="">Chọn lớp học</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Mở từ</Label>
                  <Input
                    type="datetime-local"
                    disabled={!isDraft || isSavingQuestions}
                    value={form.watch("startsAt") ?? ""}
                    onChange={(event) => form.setValue("startsAt", event.target.value || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kết thúc</Label>
                  <Input
                    type="datetime-local"
                    disabled={!isDraft || isSavingQuestions}
                    value={form.watch("endsAt") ?? ""}
                    onChange={(event) => form.setValue("endsAt", event.target.value || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Thời lượng (phút)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={180}
                    disabled={!isDraft || isSavingQuestions}
                    value={form.watch("durationMinutes") ?? ""}
                    onChange={(event) => form.setValue("durationMinutes", event.target.value || null)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={!isDraft || isSavingQuestions}>
                  {isSavingQuestions ? <Loader2 className="animate-spin" /> : <Save />}
                  Lưu thông tin
                </Button>

                {exam.status === "draft" ? (
                  <Button type="button" variant="accent" disabled={isChangingStatus} onClick={handlePublish}>
                    {isChangingStatus ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                    Phát hành kỳ thi
                  </Button>
                ) : exam.status === "published" ? (
                  <Button type="button" variant="danger" disabled={isChangingStatus} onClick={handleClose}>
                    {isChangingStatus ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    Đóng kỳ thi
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle>Bộ câu hỏi của kỳ thi</CardTitle>
              <p className="text-sm text-[color:var(--muted-foreground)]">
                {selectedQuestions.length} câu đã chọn · {selectedQuestions.reduce((total, question) => total + question.points, 0)} điểm
              </p>
            </div>

            <Button type="button" disabled={!isDraft || isSavingQuestions} onClick={handleSyncQuestions}>
              {isSavingQuestions ? <Loader2 className="animate-spin" /> : <Save />}
              Lưu bộ đề
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedQuestions.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
                Chưa có câu nào trong bộ đề. Hãy thêm câu hỏi từ ngân hàng ở cột bên phải.
              </div>
            ) : (
              selectedQuestions.map((question, index) => (
                <div key={question.questionBankItemId} className="rounded-[16px] border border-[color:var(--border)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Câu {index + 1}</Badge>
                        <Badge variant={question.questionType === "multiple_choice" ? "default" : "warning"}>
                          {question.questionType === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{bankItemsById.get(question.questionBankItemId)?.prompt ?? question.prompt}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        className="w-24"
                        disabled={!isDraft}
                        value={question.points}
                        onChange={(event) => updateQuestionPoints(question.questionBankItemId, event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!isDraft || index === 0}
                        onClick={() => moveQuestion(index, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!isDraft || index === selectedQuestions.length - 1}
                        onClick={() => moveQuestion(index, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-[#ba1a1a] hover:bg-[#fff1f0] hover:text-[#93000a]"
                        disabled={!isDraft}
                        onClick={() => removeQuestion(question.questionBankItemId)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Ngân hàng khả dụng</CardTitle>
            <ExamQuestionBankImportDialog
              examId={exam.id}
              selectedQuestionCount={selectedQuestions.length}
              disabled={!isDraft}
              onImportedItems={handleImportedItems}
            />
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Import CSV sẽ tạo câu hỏi mới trong ngân hàng và thêm ngay vào bộ đề nháp với 1 điểm mỗi câu.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {availableQuestionBankItems.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
              Bạn chưa có câu hỏi nào trong ngân hàng để ghép vào kỳ thi.
            </div>
          ) : (
            availableQuestionBankItems.map((item) => {
              const isSelected = selectedQuestions.some((question) => question.questionBankItemId === item.id);

              return (
                <div key={item.id} className="rounded-[16px] border border-[color:var(--border)] p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{item.prompt}</p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">
                          {item.question_type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"} · Đáp án đúng: {item.correct_answer}
                        </p>
                      </div>
                      <Button type="button" size="sm" disabled={!isDraft || isSelected} onClick={() => addQuestion(item)}>
                        <PlusCircle />
                        {isSelected ? "Đã chọn" : "Thêm"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
