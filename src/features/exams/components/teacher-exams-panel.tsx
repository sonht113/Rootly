"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createExamAction } from "@/features/exams/actions/exams";
import { formatExamWindow, getExamScopeLabel, getExamStatusLabel } from "@/lib/utils/exams";
import { createExamSchema } from "@/lib/validations/exams";
import type { ClassRow } from "@/types/domain";

type CreateExamFormValues = z.input<typeof createExamSchema>;

const defaultValues: CreateExamFormValues = {
  title: "",
  description: "",
  scope: "global",
  classId: null,
  startsAt: null,
  endsAt: null,
  durationMinutes: null,
};

interface TeacherExamsPanelProps {
  exams: Array<{
    id: string;
    title: string;
    description: string | null;
    scope: "class" | "global";
    status: "draft" | "published" | "closed";
    class_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
    question_count: number;
    total_points: number;
  }>;
  classes: Array<Pick<ClassRow, "id" | "name">>;
  initialClassId?: string | null;
}

export function TeacherExamsPanel({ exams, classes, initialClassId = null }: TeacherExamsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const normalizedInitialClassId = initialClassId && classes.some((classItem) => classItem.id === initialClassId) ? initialClassId : null;
  const form = useForm<CreateExamFormValues>({
    resolver: zodResolver(createExamSchema),
    defaultValues: {
      ...defaultValues,
      scope: normalizedInitialClassId ? "class" : defaultValues.scope,
      classId: normalizedInitialClassId,
    },
  });
  const scope = useWatch({
    control: form.control,
    name: "scope",
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const exam = await createExamAction(values);
        toast.success("Đã tạo kỳ thi mới.");
        router.push(`/teacher/exams/${exam.id}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tạo kỳ thi.");
      }
    });
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo kỳ thi mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Tên kỳ thi</Label>
              <Input {...form.register("title")} placeholder="Ví dụ: Kiểm tra tuần 2" />
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea {...form.register("description")} placeholder="Mô tả ngắn về mục tiêu và phạm vi kỳ thi" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Phạm vi</Label>
                <select
                  className="h-10 w-full rounded-[12px] border border-[color:var(--border)] bg-white px-3 text-sm"
                  value={scope}
                  disabled={isPending}
                  onChange={(event) => {
                    const nextScope = event.target.value as "class" | "global";
                    form.setValue("scope", nextScope);
                    if (nextScope === "global") {
                      form.setValue("classId", null);
                    } else {
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
                  disabled={isPending || scope !== "class"}
                  onChange={(event) => form.setValue("classId", event.target.value || null)}
                >
                  <option value="">{scope === "class" ? "Chọn lớp học" : "Không dùng"}</option>
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
                  value={form.watch("startsAt") ?? ""}
                  onChange={(event) => form.setValue("startsAt", event.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label>Kết thúc</Label>
                <Input
                  type="datetime-local"
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
                  placeholder="Để trống nếu không giới hạn"
                  value={form.watch("durationMinutes") ?? ""}
                  onChange={(event) => form.setValue("durationMinutes", event.target.value || null)}
                />
              </div>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <PlusCircle />}
              Tạo kỳ thi
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách kỳ thi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {exams.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
              Chưa có kỳ thi nào. Hãy tạo bản nháp đầu tiên và ghép câu hỏi từ ngân hàng.
            </div>
          ) : (
            exams.map((exam) => (
              <Link
                key={exam.id}
                href={`/teacher/exams/${exam.id}`}
                className="flex items-start justify-between gap-4 rounded-[16px] border border-[color:var(--border)] p-4 transition hover:border-[color:var(--primary)]/40 hover:bg-[color:var(--muted)]/30"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[color:var(--foreground)]">{exam.title}</p>
                    <Badge variant={exam.status === "draft" ? "outline" : exam.status === "closed" ? "danger" : "success"}>
                      {getExamStatusLabel(exam.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    {getExamScopeLabel(exam.scope)}
                    {exam.class_name ? ` · ${exam.class_name}` : ""}
                  </p>
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    {exam.question_count} câu · {exam.total_points} điểm · {formatExamWindow(exam.starts_at, exam.ends_at)}
                  </p>
                  {exam.description ? <p className="text-sm text-[color:var(--muted-foreground)]">{exam.description}</p> : null}
                </div>

                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--primary-strong)]">
                  Mở chi tiết
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
