"use client";

import { useState, useTransition } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { UploadDropzone } from "@/components/shared/upload-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ valid: unknown[]; invalid: Array<{ index: number; message: string }> } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePreview() {
    if (!file) {
      toast.error("Chọn tệp trước khi xem trước.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);

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
        <UploadDropzone
          helperText="Hỗ trợ CSV, XLSX, JSON. Mẫu template trong public/templates hiện chuẩn bị khoảng 10 từ cho mỗi root."
          fileName={file?.name}
          accept=".csv,.xlsx,.json"
          onSelect={setFile}
        />
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
                    Dòng {item.index + 1}: {item.message}
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
