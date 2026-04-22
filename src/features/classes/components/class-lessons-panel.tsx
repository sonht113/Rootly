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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createClassLessonAction,
  deleteClassLessonAction,
  uploadClassLessonVocabularyAction,
} from "@/features/classes/actions/classes";
import {
  CLASS_LESSON_CSV_ACCEPT_ATTRIBUTE,
  CLASS_LESSON_CSV_HEADERS,
  createClassLessonSchema,
} from "@/lib/validations/classes";
import type { ClassLesson } from "@/server/repositories/classes-repository";

const LESSON_TEMPLATE_PATH = "/templates/class-lessons/class-lesson-template.csv";
const LESSON_TEMPLATE_COLUMNS = CLASS_LESSON_CSV_HEADERS.join(", ");
const LESSON_VOCABULARY_PAGE_SIZE = 10;
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

function VocabularySection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
        {label}
      </p>
      {children}
    </div>
  );
}

function VocabularySynonyms({ itemId, synonyms }: { itemId: string; synonyms: string[] }) {
  if (synonyms.length === 0) {
    return <span className="text-sm text-[color:var(--muted-foreground)]">—</span>;
  }

  return (
    <ul className="space-y-1 text-sm leading-6 text-[color:var(--foreground)]">
      {synonyms.map((synonym, index) => (
        <li key={`${itemId}-synonym-${index}`} className="break-words">
          {synonym}
        </li>
      ))}
    </ul>
  );
}

function VocabularyExampleList({
  itemId,
  exampleSentences,
}: {
  itemId: string;
  exampleSentences: ClassLesson["vocabularyItems"][number]["exampleSentences"];
}) {
  if (exampleSentences.length === 0) {
    return <span className="text-sm text-[color:var(--muted-foreground)]">Chưa có câu ví dụ.</span>;
  }

  return (
    <div className="space-y-3">
      {exampleSentences.map((sentence, index) => (
        <div
          key={`${itemId}-example-${index}`}
          className="rounded-[12px] border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-3"
        >
          <p className="break-words font-medium text-[color:var(--foreground)]">{sentence.english}</p>
          {sentence.vietnamese ? (
            <p className="mt-1 break-words text-[color:var(--muted-foreground)]">{sentence.vietnamese}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function LessonVocabularyList({
  lesson,
  emptyMessage,
}: {
  lesson: ClassLesson;
  emptyMessage: string;
}) {
  const [page, setPage] = useState(1);

  if (lesson.vocabularyItems.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
        {emptyMessage}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(lesson.vocabularyItems.length / LESSON_VOCABULARY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * LESSON_VOCABULARY_PAGE_SIZE;
  const visibleItems = lesson.vocabularyItems.slice(startIndex, startIndex + LESSON_VOCABULARY_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div data-testid="lesson-vocabulary-cards" className="space-y-3 md:hidden">
        {visibleItems.map((item) => (
          <article
            key={item.id}
            data-testid="lesson-vocabulary-card"
            className="space-y-4 rounded-[16px] border border-[color:var(--border)] bg-[color:var(--background)] p-4 shadow-sm"
          >
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
                Từ vựng
              </p>
              <h4 className="break-words text-lg font-semibold text-[color:var(--foreground)]">{item.word}</h4>
            </div>

            <div className="grid gap-4">
              <VocabularySection label="Nghĩa">
                <p className="break-words text-sm leading-6 text-[color:var(--foreground)]">{item.meaning}</p>
              </VocabularySection>

              <VocabularySection label="Phiên âm">
                <p className="break-words text-sm text-[color:var(--foreground)]">{item.pronunciation ?? "—"}</p>
              </VocabularySection>

              <VocabularySection label="Từ đồng nghĩa">
                <VocabularySynonyms itemId={item.id} synonyms={item.synonyms} />
              </VocabularySection>

              <VocabularySection label="Câu ví dụ">
                <VocabularyExampleList itemId={item.id} exampleSentences={item.exampleSentences} />
              </VocabularySection>
            </div>
          </article>
        ))}
      </div>

      <div data-testid="lesson-vocabulary-table" className="hidden md:block">
        <Table aria-label={`Danh sách từ vựng của ${lesson.title}`}>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[10rem]">Từ vựng</TableHead>
              <TableHead className="min-w-[10rem]">Nghĩa</TableHead>
              <TableHead className="min-w-[9rem]">Phiên âm</TableHead>
              <TableHead className="min-w-[12rem]">Từ đồng nghĩa</TableHead>
              <TableHead className="min-w-[24rem]">Câu ví dụ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-semibold text-[color:var(--foreground)]">{item.word}</TableCell>
                <TableCell className="text-[color:var(--muted-foreground)]">{item.meaning}</TableCell>
                <TableCell className="text-[color:var(--muted-foreground)]">{item.pronunciation ?? "—"}</TableCell>
                <TableCell>
                  <VocabularySynonyms itemId={item.id} synonyms={item.synonyms} />
                </TableCell>
                <TableCell>
                  <VocabularyExampleList itemId={item.id} exampleSentences={item.exampleSentences} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div
          data-testid="lesson-vocabulary-pagination"
          className="flex flex-col gap-3 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Hiển thị {startIndex + 1}-{startIndex + visibleItems.length} / {lesson.vocabularyItems.length} từ vựng
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Trước
            </Button>
            <span className="min-w-[6rem] text-center text-sm font-medium text-[color:var(--foreground)]">
              Trang {currentPage}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Sau
            </Button>
          </div>
        </div>
      ) : null}
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
            Template CSV hiện dùng các cột {LESSON_TEMPLATE_COLUMNS}. Pronunciation là cột tùy chọn để hiển thị phiên âm cho học viên.
          </p>
          <p className="text-xs leading-5 text-[color:var(--muted-foreground)]">
            Mỗi dòng là 1 từ. Synonyms ngăn cách nhiều giá trị bằng dấu |, còn 3 cặp câu ví dụ cần điền riêng vào các cột Example Sentence EN/VI tương ứng.
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
            Giáo viên tạo buổi học theo chủ đề, sau đó tải lên tệp CSV để cập nhật danh sách từ vựng, phiên âm và 3 cặp ví dụ song ngữ cho từng buổi.
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
            Mỗi buổi học có thể chứa danh sách từ, nghĩa, phiên âm, từ đồng nghĩa và 3 cặp câu ví dụ song ngữ để học viên xem lại sau khi tham gia lớp.
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
