"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, PlayCircle, PlusCircle, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { UploadDropzone } from "@/components/shared/upload-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RootWordQuizQuestionInput } from "@/lib/validations/root-word-quizzes";

interface QuizImportPreviewResult {
  valid: RootWordQuizQuestionInput[];
  invalid: Array<{ index: number; message: string }>;
  message?: string;
}

interface RootWordQuizActionsProps {
  rootWordId: string;
  rootWordLabel: string;
  hasQuiz: boolean;
  questionCount: number;
  canManageQuiz: boolean;
}

const QUIZ_IMPORT_COLUMNS = [
  "Question Type",
  "Question",
  "Correct Answer",
  "Explanation",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
] as const;

export function RootWordQuizActions({
  rootWordId,
  rootWordLabel,
  hasQuiz,
  questionCount,
  canManageQuiz,
}: RootWordQuizActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<QuizImportPreviewResult | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  function resetState() {
    setFile(null);
    setPreview(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  }

  function handleFileSelect(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);

    if (!nextFile) {
      return;
    }

    startPreviewTransition(async () => {
      const formData = new FormData();
      formData.set("file", nextFile);

      const response = await fetch("/api/root-word-quizzes/preview", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as QuizImportPreviewResult;
      if (!response.ok) {
        toast.error(result.message ?? "Không thể xem trước tệp quiz.");
        setPreview(null);
        return;
      }

      setPreview(result);

      if (result.invalid.length > 0) {
        toast.error(result.invalid[0]?.message ?? "Tệp quiz chưa hợp lệ.");
        return;
      }

      toast.success(`Xem trước sẵn sàng: ${result.valid.length} câu hỏi hợp lệ.`);
    });
  }

  function handleImport() {
    if (!preview || preview.valid.length === 0 || preview.invalid.length > 0) {
      return;
    }

    startImportTransition(async () => {
      const response = await fetch("/api/root-word-quizzes/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rootWordId,
          questions: preview.valid,
        }),
      });

      const result = (await response.json()) as { importedCount?: number; message?: string };
      if (!response.ok) {
        toast.error(result.message ?? "Không thể nhập quiz.");
        return;
      }

      toast.success(`Đã nhập ${result.importedCount ?? 0} câu quiz cho từ gốc "${rootWordLabel}".`);
      handleOpenChange(false);
      router.refresh();
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(`Xóa bộ quiz hiện tại của từ gốc "${rootWordLabel}" để có thể nhập lại?`);
    if (!confirmed) {
      return;
    }

    startDeleteTransition(async () => {
      const response = await fetch(`/api/root-word-quizzes/${rootWordId}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { deletedCount?: number; message?: string };
      if (!response.ok) {
        toast.error(result.message ?? "Không thể xóa quiz.");
        return;
      }

      toast.success(
        result.deletedCount ? `Đã xóa quiz của từ gốc "${rootWordLabel}".` : `Từ gốc "${rootWordLabel}" hiện chưa có quiz để xóa.`,
      );
      router.refresh();
    });
  }

  const canImport = !isPreviewPending && !isImportPending && (preview?.valid.length ?? 0) > 0 && (preview?.invalid.length ?? 0) === 0;

  if (!hasQuiz && !canManageQuiz) {
    return null;
  }

  return (
    <div className="space-y-2">
      {hasQuiz ? (
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href={`/quiz/${rootWordId}`}>
            Làm quiz
            <PlayCircle className="size-4" />
          </Link>
        </Button>
      ) : null}

      {hasQuiz ? (
        <p className="text-xs text-[color:var(--muted-foreground)]">{questionCount} câu quiz đã sẵn sàng cho từ gốc này.</p>
      ) : null}

      {canManageQuiz && !hasQuiz ? (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full justify-between bg-[#0058be] text-white hover:bg-[#004ca6]">
              Thêm quiz
              <PlusCircle className="size-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className="w-[min(100%-2rem,640px)] gap-0 overflow-hidden rounded-[20px] border-none p-0 shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
            <DialogHeader className="gap-2 border-b border-[#e0e3e5] px-8 py-8 pb-4">
              <DialogTitle className="text-[2rem] leading-8 font-semibold text-[#191c1e]">
                Nhập quiz bằng CSV
              </DialogTitle>
              <DialogDescription className="text-base leading-[1.625rem] text-[#424754]">
                Tải file CSV để thêm khoảng 10 câu quiz cho từ gốc "{rootWordLabel}".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 px-8 pb-8 pt-0">
              <UploadDropzone
                accept=".csv"
                fileName={file?.name ?? null}
                onSelect={handleFileSelect}
                helperText="Chỉ hỗ trợ CSV. Dùng Question Type là multiple_choice hoặc text. Với multiple_choice, hãy điền Option A-D và để Correct Answer trùng đúng một đáp án."
                className="rounded-[12px] border-[#c2c6d6] bg-white px-10 py-10"
              />

              <div className="rounded-[12px] bg-[#f2f4f6] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#191c1e]">
                  <FileSpreadsheet className="size-4 text-[#0058be]" />
                  Yêu cầu định dạng CSV
                </div>
                <p className="mt-3 text-sm leading-5 text-[#424754]">
                  Kích thước khuyến nghị là <strong>10 câu hỏi cho mỗi từ gốc</strong>. CSV phải có đúng các cột sau:
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {QUIZ_IMPORT_COLUMNS.map((column) => (
                    <span
                      key={column}
                      className="rounded-[4px] border border-[#c2c6d61a] bg-[#e0e3e5] px-2 py-1 text-[10px] font-semibold leading-[15px] text-[#424754]"
                    >
                      {column}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-sm leading-5 text-[#424754]">
                  <strong>multiple_choice</strong> yêu cầu đủ bốn lựa chọn và <strong>Correct Answer</strong> phải khớp với một đáp án.
                  <br />
                  <strong>text</strong> để trống Option A-D và dùng <strong>Correct Answer</strong> làm đáp án mẫu.
                </p>

                {preview ? (
                  <p className="mt-4 text-sm leading-5 text-[#424754]">
                    Xem trước: <strong>{preview.valid.length}</strong> câu hợp lệ và <strong>{preview.invalid.length}</strong> dòng lỗi.
                  </p>
                ) : null}

                {preview?.invalid.length ? (
                  <div className="mt-3 space-y-1">
                    {preview.invalid.slice(0, 3).map((item) => (
                      <p key={`${item.index}-${item.message}`} className="text-xs leading-4 text-[#c2410c]">
                        Dòng {item.index}: {item.message}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-[#f2f4f6] px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/templates/quiz-import/quiz-import-template.csv"
                download
                className="inline-flex items-center gap-2 text-sm font-medium text-[#0058be]"
              >
                <FileSpreadsheet className="size-4" />
                Tải template mẫu
              </Link>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-[8px] px-4 text-sm font-medium text-[#424754]"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPreviewPending || isImportPending}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  className="h-10 rounded-[8px] bg-[#0058be] px-6 text-sm font-semibold text-white hover:bg-[#004ca6] disabled:bg-[#0058be66] disabled:text-white/60"
                  onClick={handleImport}
                  disabled={!canImport}
                >
                  {isPreviewPending || isImportPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Nhập quiz
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {canManageQuiz && hasQuiz ? (
        <Button
          type="button"
          variant="danger"
          className="w-full justify-between"
          onClick={handleDelete}
          disabled={isDeletePending}
        >
          {isDeletePending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Xóa quiz
        </Button>
      ) : null}
    </div>
  );
}
