"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center bg-[color:var(--app-bg)] px-4">
        <div className="max-w-lg space-y-4 rounded-[24px] border border-[color:var(--border)] bg-white p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--danger)]">Đã có lỗi xảy ra</p>
          <h1 className="text-3xl font-semibold">Rootly gặp sự cố tạm thời</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {error.message || "Vui lòng thử lại sau. Nếu lỗi tiếp tục xảy ra, hãy kiểm tra cấu hình Supabase và env."}
          </p>
          <Button onClick={reset}>Thử tải lại</Button>
        </div>
      </body>
    </html>
  );
}
