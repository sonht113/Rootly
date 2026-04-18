"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, FileUp, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createClassLessonAction,
  deleteClassLessonAction,
  uploadClassLessonVocabularyAction,
} from "@/features/classes/actions/classes";
import { CLASS_LESSON_CSV_ACCEPT_ATTRIBUTE, createClassLessonSchema } from "@/lib/validations/classes";
import type { ClassLesson } from "@/server/repositories/classes-repository";

const LESSON_TEMPLATE_PATH = "/templates/class-lessons/class-lesson-template.csv";
const createClassLessonClientSchema = createClassLessonSchema.omit({ classId: true });

type CreateClassLessonFormValues = z.input<typeof createClassLessonClientSchema>;
type LessonImportIssue = {
  index: number;
  message: string;
};

function formatLessonDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-[color:var(--danger)]">{message}</p>;
}

function LessonVocabularyList({
  lesson,
  emptyMessage,
}: {
  lesson: ClassLesson;
  emptyMessage: string;
}) {
  if (lesson.vocabularyItems.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div data-testid="lesson-vocabulary-scroll-container" className="max-h-[24rem] overflow-y-auto pr-2">
      <div className="space-y-3">
        {lesson.vocabularyItems.map((item) => (
          <article key={item.id} className="space-y-4 rounded-[16px] border border-[color:var(--border)] bg-white p-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold text-[color:var(--foreground)]">{item.word}</h4>
                <Badge variant="outline">{item.synonyms.length} từ đồng nghĩa</Badge>
                <Badge variant="outline">{item.exampleSentences.length} câu ví dụ</Badge>
              </div>
              <p className="break-words text-sm leading-6 text-[color:var(--muted-foreground)]">{item.meaning}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <section className="space-y-2 rounded-[14px] bg-[color:var(--muted)]/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  Từ đồng nghĩa
                </p>
                <ul className="space-y-1 text-sm leading-6 text-[color:var(--foreground)]">
                  {item.synonyms.map((synonym, index) => (
                    <li key={`${item.id}-synonym-${index}`} className="break-words">
                      {synonym}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2 rounded-[14px] bg-[color:var(--muted)]/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                  Câu ví dụ
                </p>
                <ul className="space-y-1 text-sm leading-6 text-[color:var(--foreground)]">
                  {item.exampleSentences.map((sentence, index) => (
                    <li key={`${item.id}-example-${index}`} className="break-words">
                      {sentence}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LessonImportIssues({ issues }: { issues: LessonImportIssue[] }) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[14px] border border-[color:var(--danger)]/25 bg-[color:var(--danger-soft)] p-4">
      <p className="text-sm font-semibold text-[color:var(--danger)]">CSV cần điều chỉnh trước khi lưu:</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-[color:var(--foreground)]">
        {issues.map((issue, index) => (
          <li key={`${issue.index}-${index}`}>
            Dòng {issue.index}: {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LessonVocabularyUploadForm({
  classId,
  lessonId,
}: {
  classId: string;
  lessonId: string;
}) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [issues, setIssues] = useState<LessonImportIssue[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Vui lòng chọn tệp CSV từ vựng.");
      return;
    }

    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("lessonId", lessonId);
    formData.set("file", file);

    startTransition(async () => {
      try {
        const result = await uploadClassLessonVocabularyAction(formData);

        if (!result.success) {
          setIssues(result.invalid);
          toast.error(result.message);
          return;
        }

        setIssues([]);
        fileInputRef.current?.form?.reset();
        toast.success(result.message);
        router.refresh();
      } catch (error) {
        setIssues([]);
        toast.error(error instanceof Error ? error.message : "Không thể tải CSV từ vựng.");
      }
    });
  }

  return (
    <form className="space-y-3 rounded-[16px] border border-dashed border-[color:var(--border)] p-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex-1 space-y-2">
          <Label htmlFor={fileInputId}>Tải danh sách từ vựng CSV</Label>
          <Input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept={CLASS_LESSON_CSV_ACCEPT_ATTRIBUTE}
            disabled={isPending}
            onChange={() => setIssues([])}
          />
          <p className="text-xs leading-5 text-[color:var(--muted-foreground)]">
            Cột bắt buộc: Word, Meaning, Synonyms, Example Sentences. Nhiều giá trị trong Synonyms và Example Sentences ngăn cách bằng dấu |.
          </p>
          <p className="text-xs leading-5 text-[color:var(--muted-foreground)]">
            Mỗi dòng là 1 từ. Vui lòng dùng đúng tên cột trong CSV.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <a href={LESSON_TEMPLATE_PATH} download>
              <Download className="size-4" />
              Tải file mẫu
            </a>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            Tải CSV
          </Button>
        </div>
      </div>

      <LessonImportIssues issues={issues} />
    </form>
  );
}

function DeleteLessonButton({
  classId,
  lessonId,
  lessonTitle,
}: {
  classId: string;
  lessonId: string;
  lessonTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-[color:var(--danger)] hover:bg-[#fff1f0] hover:text-[#93000a]">
          <Trash2 className="size-4" />
          Xóa buổi học
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa buổi học này?</AlertDialogTitle>
          <AlertDialogDescription>
            Buổi học <strong>{lessonTitle}</strong> và toàn bộ danh sách từ vựng đã tải lên sẽ bị xóa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  const result = await deleteClassLessonAction({ classId, lessonId });

                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }

                  toast.success(result.message);
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Không thể xóa buổi học.");
                }
              });
            }}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Xác nhận xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TeacherLessonCard({
  classId,
  lesson,
}: {
  classId: string;
  lesson: ClassLesson;
}) {
  return (
    <article className="space-y-4 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--background)] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{lesson.title}</h3>
            <Badge>{lesson.vocabularyItemCount} từ vựng</Badge>
            <Badge variant="outline">Cập nhật {formatLessonDate(lesson.updatedAt)}</Badge>
          </div>
          {lesson.description ? (
            <p className="max-w-3xl break-words text-sm leading-6 text-[color:var(--muted-foreground)]">
              {lesson.description}
            </p>
          ) : null}
        </div>

        <DeleteLessonButton classId={classId} lessonId={lesson.id} lessonTitle={lesson.title} />
      </div>

      <LessonVocabularyUploadForm classId={classId} lessonId={lesson.id} />

      <LessonVocabularyList lesson={lesson} emptyMessage="Buổi học này chưa có tệp CSV từ vựng." />
    </article>
  );
}

function StudentLessonCard({ lesson }: { lesson: ClassLesson }) {
  return (
    <article className="space-y-4 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--background)] p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{lesson.title}</h3>
          <Badge>{lesson.vocabularyItemCount} từ vựng</Badge>
          <Badge variant="outline">Cập nhật {formatLessonDate(lesson.updatedAt)}</Badge>
        </div>
        {lesson.description ? (
          <p className="break-words text-sm leading-6 text-[color:var(--muted-foreground)]">{lesson.description}</p>
        ) : null}
      </div>

      <LessonVocabularyList lesson={lesson} emptyMessage="Giáo viên chưa tải danh sách từ vựng cho buổi học này." />
    </article>
  );
}

export function TeacherClassLessonsPanel({
  classId,
  lessons,
}: {
  classId: string;
  lessons: ClassLesson[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateClassLessonFormValues>({
    resolver: zodResolver(createClassLessonClientSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const result = await createClassLessonAction({
          classId,
          title: values.title,
          description: values.description,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        form.reset();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tạo buổi học.");
      }
    });
  });

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Tạo buổi học</CardTitle>
          <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
            Giáo viên tạo buổi học theo chủ đề, sau đó tải lên tệp CSV để cập nhật danh sách từ vựng cho từng buổi.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Tiêu đề buổi học</Label>
              <Input
                id="lesson-title"
                {...form.register("title")}
                placeholder="Ví dụ: Buổi 1 - Từ vựng về lớp học"
                disabled={isPending}
              />
              <FieldError message={form.formState.errors.title?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-description">Mô tả</Label>
              <Textarea
                id="lesson-description"
                {...form.register("description")}
                placeholder="Nêu mục tiêu của buổi học, chủ điểm từ vựng hoặc cách học đề xuất."
                disabled={isPending}
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
              Tạo buổi học
            </Button>
          </form>

          <div className="rounded-[16px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
            File mẫu nằm tại <span className="font-medium">{LESSON_TEMPLATE_PATH}</span>. Bạn có thể tải trực tiếp từ từng buổi học để nhập đúng định dạng CSV.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Buổi học từ vựng</CardTitle>
          <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
            Mỗi buổi học có thể chứa danh sách từ, nghĩa, từ đồng nghĩa và câu ví dụ để học viên xem lại sau khi tham gia lớp.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {lessons.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
              Chưa có buổi học nào. Hãy tạo buổi học đầu tiên để bắt đầu tải danh sách từ vựng.
            </div>
          ) : (
            lessons.map((lesson) => <TeacherLessonCard key={lesson.id} classId={classId} lesson={lesson} />)
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function StudentClassLessonsPanel({ lessons }: { lessons: ClassLesson[] }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Buổi học từ giáo viên</CardTitle>
        <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
          Khi đã tham gia lớp, bạn có thể xem toàn bộ nội dung mà giáo viên tải lên cho từng buổi học.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {lessons.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
            Giáo viên chưa tạo buổi học nào cho lớp này.
          </div>
        ) : (
          lessons.map((lesson) => <StudentLessonCard key={lesson.id} lesson={lesson} />)
        )}
      </CardContent>
    </Card>
  );
}
