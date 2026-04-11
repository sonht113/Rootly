"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, PlusCircle } from "lucide-react";
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

interface ImportPreviewResult {
  valid: unknown[];
  invalid: Array<{ index: number; message: string }>;
  message?: string;
}

const ROOTS_IMPORT_COLUMNS = [
  "Root Word",
  "Meaning",
  "Word List",
  "Examples",
  "Pronunciation",
] as const;

export function RootsImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
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
      formData.set("mode", "roots");

      const response = await fetch("/api/imports/preview", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as ImportPreviewResult;
      if (!response.ok) {
        toast.error(result.message ?? "Không thể xem trước tệp CSV.");
        setPreview(null);
        return;
      }

      setPreview(result);

      if (result.invalid.length > 0 && result.valid.length === 0) {
        toast.error(result.invalid[0]?.message ?? "Tệp CSV không hợp lệ.");
        return;
      }

      if (result.invalid.length > 0) {
        toast.warning(`Xem trước sẵn sàng: ${result.valid.length} từ gốc hợp lệ và ${result.invalid.length} dòng lỗi.`);
        return;
      }

      toast.success(`Xem trước sẵn sàng: ${result.valid.length} từ gốc.`);
    });
  }

  function handleImport() {
    if (!preview || preview.valid.length === 0) {
      return;
    }

    startImportTransition(async () => {
      const response = await fetch("/api/imports/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roots: preview.valid }),
      });

      const result = (await response.json()) as { importedCount?: number; message?: string };
      if (!response.ok) {
        toast.error(result.message ?? "Không thể nhập từ gốc.");
        return;
      }

      toast.success(`Đã nhập ${result.importedCount ?? 0} từ gốc.`);
      handleOpenChange(false);
      router.refresh();
    });
  }

  const canImport = !isPreviewPending && !isImportPending && (preview?.valid.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-[12px] bg-[#0058be] px-5 text-sm font-semibold text-white hover:bg-[#004ca6]">
          <PlusCircle className="size-4" />
          Tạo mới
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[min(100%-2rem,576px)] gap-0 overflow-hidden rounded-[20px] border-none p-0 shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
        <DialogHeader className="gap-2 border-b border-[#e0e3e5] px-8 py-8 pb-4">
          <DialogTitle className="text-[2rem] leading-8 font-semibold text-[#191c1e]">
            Nhập từ gốc
          </DialogTitle>
          <DialogDescription className="text-base leading-[1.625rem] text-[#424754]">
            Tải tệp CSV lên để thêm nhiều từ gốc vào thư viện cùng lúc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-8 pb-8 pt-0">
          <UploadDropzone
            accept=".csv"
            fileName={file?.name ?? null}
            onSelect={handleFileSelect}
            helperText="Chỉ hỗ trợ CSV. Cột Meaning cần theo dạng English => Vietnamese, chuẩn bị khoảng 10 từ cho mỗi root, ngăn cách bằng | và giữ nguyên dấu tiếng Việt."
            className="rounded-[12px] border-[#c2c6d6] bg-white px-10 py-10"
          />

          <div className="rounded-[12px] bg-[#f2f4f6] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#191c1e]">
              <FileSpreadsheet className="size-4 text-[#0058be]" />
              Yêu cầu định dạng CSV
            </div>
            <p className="mt-3 text-sm leading-4 text-[#424754]">
              Tệp CSV phải có đúng các cột tiêu đề sau:
            </p>
            <p className="mt-2 text-sm leading-5 text-[#424754]">
              Viết cột <strong>Meaning</strong> theo dạng <strong>English =&gt; Vietnamese</strong>, ví dụ{" "}
              <strong>to look =&gt; nhìn; xem</strong>.
            </p>
            <p className="mt-2 text-sm leading-5 text-[#424754]">
              Mẫu template hiện chuẩn bị sẵn <strong>khoảng 10 từ vựng cho mỗi root</strong>.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ROOTS_IMPORT_COLUMNS.map((column) => (
                <span
                  key={column}
                  className="rounded-[4px] border border-[#c2c6d61a] bg-[#e0e3e5] px-2 py-1 text-[10px] font-semibold leading-[15px] text-[#424754]"
                >
                  {column}
                </span>
              ))}
            </div>

            {preview ? (
              <p className="mt-4 text-sm leading-5 text-[#424754]">
                Xem trước: <strong>{preview.valid.length}</strong> từ gốc hợp lệ và <strong>{preview.invalid.length}</strong>{" "}
                dòng lỗi.
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
            href="/templates/roots-import-template.csv"
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
                  Nhập từ gốc
                </Button>
              </div>
            </div>
      </DialogContent>
    </Dialog>
  );
}
