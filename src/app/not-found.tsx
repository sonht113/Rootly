import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-4 rounded-[24px] border border-[color:var(--border)] bg-white p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--primary-strong)]">404</p>
        <h1 className="text-3xl font-semibold">Không tìm thấy trang bạn cần</h1>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Có thể liên kết đã thay đổi, hoặc nội dung này chưa được publish.
        </p>
        <Button asChild>
          <Link href="/">Quay về dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
