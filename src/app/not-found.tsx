import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-4 rounded-[24px] border border-[color:var(--border)] bg-white p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--primary-strong)]">404</p>
        <h1 className="text-3xl font-semibold">Khong tim thay trang ban can</h1>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Co the lien ket da thay doi, hoac noi dung nay chua duoc publish.
        </p>
        <Button asChild>
          <Link href="/">Quay ve dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
