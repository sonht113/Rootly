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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--danger)]">Da co loi xay ra</p>
          <h1 className="text-3xl font-semibold">Rootly gap su co tam thoi</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {error.message || "Vui long thu lai sau. Neu loi tiep tuc xay ra, hay kiem tra cau hinh Supabase va env."}
          </p>
          <Button onClick={reset}>Thu tai lai</Button>
        </div>
      </body>
    </html>
  );
}
