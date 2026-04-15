"use client";

import Link from "next/link";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
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
import { EXAM_QUESTION_BANK_IMPORT_HEADERS, type ExamQuestionBankImportQuestionInput } from "@/lib/validations/exams";
import type { ExamQuestionBankItemRow } from "@/types/domain";
import { cn } from "@/lib/utils/cn";

interface ExamQuestionBankImportPreviewResult {
  valid: ExamQuestionBankImportQuestionInput[];
  invalid: Array<{ index: number; message: string }>;
  message?: string;
}

interface ExamQuestionBankImportCommitResult {
  importedCount?: number;
  items?: ExamQuestionBankItemRow[];
  message?: string;
}

interface ExamQuestionBankImportDialogProps {
  disabled?: boolean;
  examId?: string | null;
  selectedQuestionCount?: number;
  onImportedItems?: (items: ExamQuestionBankItemRow[]) => void;
  triggerClassName?: string;
}

export function ExamQuestionBankImportDialog({
  disabled = false,
  examId,
  selectedQuestionCount,
  onImportedItems,
  triggerClassName,
}: ExamQuestionBankImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExamQuestionBankImportPreviewResult | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();

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
      if (selectedQuestionCount !== undefined) {
        formData.set("selectedQuestionCount", String(selectedQuestionCount));
      }

      const response = await fetch("/api/exams/question-bank/preview", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as ExamQuestionBankImportPreviewResult;
      if (!response.ok) {
        toast.error(result.message ?? "Không thể xem trước tệp câu hỏi.");
        setPreview(null);
        return;
      }

      setPreview(result);
      if (result.invalid.length > 0) {
        toast.error(result.invalid[0]?.message ?? "Tệp câu hỏi chưa hợp lệ.");
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
      const response = await fetch("/api/exams/question-bank/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId,
          selectedQuestionCount: selectedQuestionCount ?? 0,
          questions: preview.valid,
        }),
      });

      const result = (await response.json()) as ExamQuestionBankImportCommitResult;
      if (!response.ok) {
        toast.error(result.message ?? "Không thể nhập câu hỏi.");
        return;
      }

      const items = result.items ?? [];
      onImportedItems?.(items);
      toast.success(
        selectedQuestionCount !== undefined
          ? `Đã nhập ${result.importedCount ?? items.length} câu vào ngân hàng và thêm vào bộ đề nháp.`
          : `Đã nhập ${result.importedCount ?? items.length} câu vào ngân hàng.`,
      );
      handleOpenChange(false);
    });
  }

  const canImport =
    !disabled &&
    !isPreviewPending &&
    !isImportPending &&
    (preview?.valid.length ?? 0) > 0 &&
    (preview?.invalid.length ?? 0) === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className={cn("gap-2", triggerClassName)}>
          <Upload className="size-4" />
          Import CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[min(100%-2rem,860px)] gap-0 overflow-hidden rounded-[20px] border-none p-0 shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
        <DialogHeader className="gap-2 border-b border-[#e0e3e5] px-8 py-8 pb-4">
          <DialogTitle className="text-[2rem] leading-8 font-semibold text-[#191c1e]">
            Import câu hỏi bằng CSV
          </DialogTitle>
          <DialogDescription className="text-base leading-[1.625rem] text-[#424754]">
            Tải file CSV gồm câu hỏi trắc nghiệm, bốn đáp án và cột <strong>Correct Answer</strong> dùng mã{" "}
            <strong>A/B/C/D</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-8 py-6">
          <UploadDropzone
            accept=".csv"
            fileName={file?.name ?? null}
            onSelect={handleFileSelect}
            helperText="Chỉ hỗ trợ CSV. Mỗi dòng là một câu multiple_choice với đủ Option A-D và Correct Answer là A, B, C hoặc D."
            className="rounded-[12px] border-[#c2c6d6] bg-white px-10 py-10"
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-[16px] border border-[#e0e3e5] bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#191c1e]">
                <FileSpreadsheet className="size-4 text-[#0058be]" />
                Xem trước nội dung import
              </div>

              {preview?.valid.length ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-[#424754]">
                    {preview.valid.length} câu hợp lệ{preview.valid.length > 10 ? ", đang hiển thị 10 câu đầu tiên." : "."}
                  </p>

                  <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
                    {preview.valid.slice(0, 10).map((question, index) => (
                      <div key={`${question.prompt}-${index}`} className="rounded-[14px] border border-[#e0e3e5] p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#5e6472]">
                          <span className="rounded-full bg-[#eef2ff] px-2 py-1 font-semibold text-[#1d4ed8]">
                            Câu {index + 1}
                          </span>
                          <span className="rounded-full bg-[#f2f4f6] px-2 py-1">Đáp án: {question.correct_answer}</span>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-[#191c1e]">{question.prompt}</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {[question.option_a, question.option_b, question.option_c, question.option_d].map((option, optionIndex) => (
                            <div key={`${question.prompt}-option-${optionIndex}`} className="rounded-[10px] bg-[#f7f8fa] px-3 py-2 text-sm text-[#424754]">
                              {String.fromCharCode(65 + optionIndex)}. {option}
                            </div>
                          ))}
                        </div>

                        {question.explanation ? (
                          <p className="mt-3 text-xs leading-5 text-[#5e6472]">Giải thích: {question.explanation}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#5e6472]">
                  Chọn một file CSV để xem trước các câu hỏi hợp lệ trước khi lưu.
                </p>
              )}

              {preview?.invalid.length ? (
                <div className="mt-4 rounded-[14px] bg-[#fff7ed] p-4">
                  <p className="text-sm font-semibold text-[#9a3412]">
                    Có {preview.invalid.length} dòng lỗi. Hãy sửa file trước khi import.
                  </p>
                  <div className="mt-3 space-y-1">
                    {preview.invalid.slice(0, 5).map((item) => (
                      <p key={`${item.index}-${item.message}`} className="text-xs leading-5 text-[#c2410c]">
                        Dòng {item.index}: {item.message}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 rounded-[16px] bg-[#f2f4f6] p-5">
              <div>
                <p className="text-sm font-semibold text-[#191c1e]">Định dạng bắt buộc</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXAM_QUESTION_BANK_IMPORT_HEADERS.map((column) => (
                    <span
                      key={column}
                      className="rounded-[999px] border border-[#d7dae0] bg-white px-3 py-1 text-[11px] font-semibold text-[#424754]"
                    >
                      {column}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-sm leading-6 text-[#424754]">
                <p>Chỉ hỗ trợ câu trắc nghiệm trong lần import này.</p>
                <p>Cột Correct Answer phải là A, B, C hoặc D để map vào đáp án tương ứng.</p>
                {selectedQuestionCount !== undefined ? (
                  <p>Bộ đề hiện có {selectedQuestionCount} câu đang chọn. Preview sẽ chặn nếu vượt quá 50 câu.</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Link
                  href="/templates/exam-question-bank-import/exam-question-bank-import-template.csv"
                  download
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#0058be]"
                >
                  <FileSpreadsheet className="size-4" />
                  Tải template CSV
                </Link>
                <Link
                  href="/templates/exam-question-bank-import/exam-question-bank-import-sample.csv"
                  download
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#0058be]"
                >
                  <FileSpreadsheet className="size-4" />
                  Tải file mẫu
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e0e3e5] bg-[#f7f8fa] px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#5e6472]">
            {preview
              ? `Xem trước: ${preview.valid.length} dòng hợp lệ, ${preview.invalid.length} dòng lỗi.`
              : "Chưa có dữ liệu xem trước."}
          </p>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPreviewPending || isImportPending}>
              Hủy
            </Button>
            <Button type="button" onClick={handleImport} disabled={!canImport}>
              {isPreviewPending || isImportPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Lưu câu hỏi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
