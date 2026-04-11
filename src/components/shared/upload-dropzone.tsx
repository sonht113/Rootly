"use client";

import { ImageUp } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface UploadDropzoneProps {
  accept?: string;
  helperText: string;
  onSelect: (file: File | null) => void;
  fileName?: string | null;
  className?: string;
}

export function UploadDropzone({
  accept,
  helperText,
  onSelect,
  fileName,
  className,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/70 p-6 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-white p-3 text-[color:var(--primary-strong)] shadow-sm">
        <ImageUp className="size-5" />
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-sm font-medium">{fileName ?? "Kéo thả hoặc chọn tệp"}</p>
        <p className="text-xs text-[color:var(--muted-foreground)]">{helperText}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
        Chọn tệp
      </Button>
    </div>
  );
}
