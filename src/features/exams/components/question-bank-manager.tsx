"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createQuestionBankItemAction,
  deleteQuestionBankItemAction,
} from "@/features/exams/actions/exams";
import { ExamQuestionBankImportDialog } from "@/features/exams/components/exam-question-bank-import-dialog";
import { examQuestionBankItemSchema } from "@/lib/validations/exams";
import type { ExamQuestionBankItemRow } from "@/types/domain";

type QuestionBankFormValues = z.input<typeof examQuestionBankItemSchema>;

const defaultMultipleChoiceValues: QuestionBankFormValues = {
  question_type: "multiple_choice",
  prompt: "",
  correct_answer: "",
  explanation: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
};

const defaultTextValues: QuestionBankFormValues = {
  question_type: "text",
  prompt: "",
  correct_answer: "",
  explanation: "",
  option_a: null,
  option_b: null,
  option_c: null,
  option_d: null,
};

function prependUniqueItems(current: ExamQuestionBankItemRow[], incoming: ExamQuestionBankItemRow[]) {
  const seen = new Set(current.map((item) => item.id));
  const nextItems = incoming.filter((item) => !seen.has(item.id));
  return [...nextItems, ...current];
}

export function QuestionBankManager({ items }: { items: ExamQuestionBankItemRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [bankItems, setBankItems] = useState(items);
  const form = useForm<QuestionBankFormValues>({
    resolver: zodResolver(examQuestionBankItemSchema),
    defaultValues: defaultMultipleChoiceValues,
  });
  const questionType = useWatch({
    control: form.control,
    name: "question_type",
  });

  useEffect(() => {
    setBankItems(items);
  }, [items]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const item = await createQuestionBankItemAction(values);
        setBankItems((current) => prependUniqueItems(current, [item]));
        toast.success("Đã thêm câu hỏi vào ngân hàng.");
        form.reset(values.question_type === "text" ? defaultTextValues : defaultMultipleChoiceValues);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể thêm câu hỏi.");
      }
    });
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle>Ngân hàng câu hỏi</CardTitle>
        <ExamQuestionBankImportDialog onImportedItems={(importedItems) => setBankItems((current) => prependUniqueItems(current, importedItems))} />
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Loại câu hỏi</Label>
            <select
              className="h-10 w-full rounded-[12px] border border-[color:var(--border)] bg-white px-3 text-sm"
              value={questionType}
              disabled={isPending}
              onChange={(event) => {
                const nextValue = event.target.value as "multiple_choice" | "text";
                form.reset(nextValue === "text" ? defaultTextValues : defaultMultipleChoiceValues);
              }}
            >
              <option value="multiple_choice">Trắc nghiệm</option>
              <option value="text">Tự luận ngắn</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Câu hỏi</Label>
            <Textarea {...form.register("prompt")} placeholder="Nhập nội dung câu hỏi" />
          </div>

          <div className="space-y-2">
            <Label>Giải thích</Label>
            <Textarea {...form.register("explanation")} placeholder="Ghi chú thêm cho người ra đề" />
          </div>

          {questionType === "multiple_choice" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Đáp án A</Label>
                <Input {...form.register("option_a")} placeholder="Lựa chọn A" />
              </div>
              <div className="space-y-2">
                <Label>Đáp án B</Label>
                <Input {...form.register("option_b")} placeholder="Lựa chọn B" />
              </div>
              <div className="space-y-2">
                <Label>Đáp án C</Label>
                <Input {...form.register("option_c")} placeholder="Lựa chọn C" />
              </div>
              <div className="space-y-2">
                <Label>Đáp án D</Label>
                <Input {...form.register("option_d")} placeholder="Lựa chọn D" />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Đáp án đúng</Label>
            <Input
              {...form.register("correct_answer")}
              placeholder={questionType === "multiple_choice" ? "Phải trùng một đáp án ở trên" : "Nhập đáp án chuẩn"}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <PlusCircle />}
            Thêm vào ngân hàng
          </Button>
        </form>

        <div className="space-y-3">
          {bankItems.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
              Chưa có câu hỏi nào trong ngân hàng. Hãy tạo vài câu trước khi ghép thành kỳ thi.
            </div>
          ) : (
            bankItems.map((item) => (
              <QuestionBankListItem
                key={item.id}
                item={item}
                onDeleted={(itemId) => setBankItems((current) => current.filter((entry) => entry.id !== itemId))}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuestionBankListItem({
  item,
  onDeleted,
}: {
  item: ExamQuestionBankItemRow;
  onDeleted: (itemId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-[16px] border border-[color:var(--border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">{item.prompt}</p>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {item.question_type === "multiple_choice" ? "Trắc nghiệm" : "Tự luận"} · Đáp án đúng: {item.correct_answer}
          </p>
          {item.question_type === "multiple_choice" ? (
            <div className="grid gap-2 text-xs text-[color:var(--muted-foreground)] md:grid-cols-2">
              {[item.option_a, item.option_b, item.option_c, item.option_d]
                .filter((option): option is string => Boolean(option))
                .map((option) => (
                  <span key={option} className="rounded-[10px] bg-[color:var(--muted)] px-2 py-1">
                    {option}
                  </span>
                ))}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-[#ba1a1a] hover:bg-[#fff1f0] hover:text-[#93000a]"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              try {
                await deleteQuestionBankItemAction({ itemId: item.id });
                onDeleted(item.id);
                toast.success("Đã xóa câu hỏi khỏi ngân hàng.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Không thể xóa câu hỏi.");
              }
            });
          }}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
          Xóa
        </Button>
      </div>
    </div>
  );
}
