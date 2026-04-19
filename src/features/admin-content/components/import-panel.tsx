"use client";

import { useState, useTransition } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { UploadDropzone } from "@/components/shared/upload-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ImportMode = "detailed" | "roots";

const DETAILED_CSV_TEMPLATE_PATH = "/templates/root-words.csv";
const DETAILED_JSON_TEMPLATE_PATH = "/templates/root-words.json";
const ROOTS_SAMPLE_TEMPLATE_PATH = "/templates/roots-import-template.csv";
const ROOTS_FULL_TEMPLATE_PATH = "/templates/root-words-full.csv";

const IMPORT_MODE_COPY: Record<
  ImportMode,
  {
    accept: string;
    title: string;
    description: string;
    helperText: string;
  }
> = {
  detailed: {
    accept: ".csv,.xlsx,.json",
    title: "Detailed import",
    description: "Import đầy đủ root, words, meanings và example sentences theo schema chi tiết hiện có.",
    helperText: "Hỗ trợ CSV, XLSX, JSON. Dùng khi bạn muốn kiểm soát từng word và từng câu ví dụ.",
  },
  roots: {
    accept: ".csv,text/csv",
    title: "Roots-only import",
    description: 'Import nhanh theo 5 cột: "Root Word", "Meaning", "Word List", "Examples", "Pronunciation".',
    helperText: 'Chỉ hỗ trợ CSV. Dùng "|" để ngăn cách danh sách và "=>" để ghi song ngữ Anh => Việt.',
  },
};

export function ImportPanel() {
  const [importMode, setImportMode] = useState<ImportMode>("detailed");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ valid: unknown[]; invalid: Array<{ index: number; message: string }> } | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeMode = IMPORT_MODE_COPY[importMode];

  function handleModeChange(nextMode: ImportMode) {
    setImportMode(nextMode);
    setFile(null);
    setPreview(null);
  }

  function handlePreview() {
    if (!file) {
      toast.error("Chọn tệp trước khi xem trước.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("mode", importMode);

      const response = await fetch("/api/imports/preview", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { valid: unknown[]; invalid: Array<{ index: number; message: string }>; message?: string };
      if (!response.ok) {
        toast.error(result.message ?? "Không thể xem trước tệp nhập liệu.");
        return;
      }

      setPreview(result);
      toast.success("Đã phân tích tệp nhập liệu");
    });
  }

  function handleCommit() {
    if (!preview) {
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/imports/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roots: preview.valid }),
      });

      const result = (await response.json()) as { importedCount?: number; message?: string };
      if (!response.ok) {
        toast.error(result.message ?? "Không thể nhập dữ liệu.");
        return;
      }

      toast.success(`Đã nhập ${result.importedCount ?? 0} từ gốc`);
      setPreview(null);
      setFile(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-[color:var(--primary-strong)]" />
          Import nội dung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {(["detailed", "roots"] as const).map((mode) => {
            const modeCopy = IMPORT_MODE_COPY[mode];
            const isActive = importMode === mode;

            return (
              <button
                key={mode}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleModeChange(mode)}
                className={[
                  "rounded-[16px] border p-4 text-left transition-colors",
                  isActive
                    ? "border-[color:var(--primary)] bg-[color:var(--muted)]/60 shadow-sm"
                    : "border-[color:var(--border)] bg-white hover:bg-[color:var(--muted)]/40",
                ].join(" ")}
              >
                <p className="text-sm font-semibold">{modeCopy.title}</p>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{modeCopy.description}</p>
              </button>
            );
          })}
        </div>

        <UploadDropzone
          helperText={activeMode.helperText}
          fileName={file?.name}
          accept={activeMode.accept}
          onSelect={(nextFile) => {
            setFile(nextFile);
            setPreview(null);
          }}
        />

        <div className="flex flex-wrap gap-3">
          {importMode === "detailed" ? (
            <>
              <Button asChild type="button" variant="outline" size="sm">
                <a href={DETAILED_CSV_TEMPLATE_PATH} download>
                  Tải template CSV chi tiết
                </a>
              </Button>
              <Button asChild type="button" variant="outline" size="sm">
                <a href={DETAILED_JSON_TEMPLATE_PATH} download>
                  Tải template JSON chi tiết
                </a>
              </Button>
            </>
          ) : (
            <>
              <Button asChild type="button" variant="outline" size="sm">
                <a href={ROOTS_FULL_TEMPLATE_PATH} download>
                  Tải template full 60 roots
                </a>
              </Button>
              <Button asChild type="button" variant="outline" size="sm">
                <a href={ROOTS_SAMPLE_TEMPLATE_PATH} download>
                  Tải template roots mẫu
                </a>
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={handlePreview} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Xem trước dữ liệu
          </Button>
          <Button type="button" variant="accent" onClick={handleCommit} disabled={isPending || !preview || preview.valid.length === 0}>
            Import hợp lệ
          </Button>
        </div>

        {preview ? (
          <div className="space-y-3 rounded-[16px] border border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm">
            <p>
              Bản xem trước: <strong>{preview.valid.length}</strong> từ gốc hợp lệ, <strong>{preview.invalid.length}</strong> lỗi.
            </p>
            {preview.invalid.length > 0 ? (
              <div className="space-y-2">
                {preview.invalid.slice(0, 5).map((item) => (
                  <p key={`${item.index}-${item.message}`} className="text-[color:var(--danger)]">
                    Dòng {item.index}: {item.message}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
