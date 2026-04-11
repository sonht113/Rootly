import Link from "next/link";
import { PencilLine, PlusCircle, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteRootWordAction } from "@/features/admin-content/actions/root-words";
import { ImportPanel } from "@/features/admin-content/components/import-panel";
import { getAdminRootWords } from "@/server/repositories/root-words-repository";

export default async function AdminRootWordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; published?: string }>;
}) {
  const params = await searchParams;
  const rootWords = await getAdminRootWords({
    query: params.q,
    published: params.published,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị"
        title="Quản lý nội dung từ gốc"
        description="Tạo mới, chỉnh sửa, nhập và xuất bản nội dung để học viên có thể học ngay trên thư viện."
        action={
          <Button asChild variant="accent">
            <Link href="/admin/root-words/new">
              <PlusCircle className="size-4" />
              Tạo từ gốc
            </Link>
          </Button>
        }
      />

      <ImportPanel />

      <form className="grid gap-3 rounded-[18px] border border-[color:var(--border)] bg-white p-4 md:grid-cols-[1fr_180px_auto]">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Tìm từ gốc..."
          className="h-10 rounded-[12px] border border-[color:var(--border)] px-3 text-sm"
        />
        <select name="published" defaultValue={params.published ?? ""} className="h-10 rounded-[12px] border border-[color:var(--border)] px-3 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="draft">Bản nháp</option>
        </select>
        <button type="submit" className="rounded-[12px] bg-[color:var(--primary)] px-4 text-sm font-semibold text-white">
          Lọc
        </button>
      </form>

      <div className="grid gap-4">
        {rootWords.map((rootWord) => (
          <Card key={rootWord.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl lowercase">{rootWord.root}</CardTitle>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{rootWord.meaning}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={rootWord.is_published ? "success" : "outline"}>{rootWord.is_published ? "Đã xuất bản" : "Bản nháp"}</Badge>
                <Badge>{rootWord.level}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {rootWord.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link href={`/admin/root-words/new?edit=${rootWord.id}`}>
                    <PencilLine className="size-4" />
                    Chỉnh sửa
                  </Link>
                </Button>
                <form action={deleteRootWordAction.bind(null, rootWord.id)}>
                  <Button type="submit" variant="ghost">
                    <Trash2 className="size-4" />
                    Xoá
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
