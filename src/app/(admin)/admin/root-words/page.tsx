import Link from "next/link";
import { ChevronLeft, ChevronRight, PencilLine, PlusCircle, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteRootWordAction, setTodayRecommendedRootWordAction } from "@/features/admin-content/actions/root-words";
import { ImportPanel } from "@/features/admin-content/components/import-panel";
import { getTodayDailyRootRecommendation } from "@/server/repositories/daily-root-recommendations-repository";
import { getPaginatedAdminRootWords } from "@/server/repositories/root-words-repository";

const ADMIN_ROOT_WORDS_PAGE_SIZE = 10;

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parsePageValue(rawPage?: string) {
  const parsed = Number.parseInt(rawPage ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildAdminRootWordsHref({
  query,
  published,
  page,
}: {
  query: string;
  published: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (published) {
    params.set("published", published);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const nextQuery = params.toString();
  return nextQuery ? `/admin/root-words?${nextQuery}` : "/admin/root-words";
}

export default async function AdminRootWordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; published?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const published = params.published?.trim() ?? "";
  const requestedPage = parsePageValue(params.page);
  const [{ items: rootWords, totalCount, totalPages, currentPage, pageSize }, todayRecommendation] = await Promise.all([
    getPaginatedAdminRootWords({
      query: query || undefined,
      published: published || undefined,
      page: requestedPage,
      pageSize: ADMIN_ROOT_WORDS_PAGE_SIZE,
    }),
    getTodayDailyRootRecommendation(),
  ]);

  const visibleRangeStart = rootWords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleRangeEnd = rootWords.length > 0 ? visibleRangeStart + rootWords.length - 1 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị"
        title="Quản lý root word"
        description="Theo dõi danh sách root word, thêm mới, chỉnh sửa, xóa và điều phối nội dung hiển thị cho học viên ngay trong khu vực admin."
        action={
          <Button asChild variant="accent">
            <Link href="/admin/root-words/new">
              <PlusCircle className="size-4" />
              Tạo root word
            </Link>
          </Button>
        }
      />

      <ImportPanel />

      <Card>
        <CardHeader>
          <CardTitle>Root từ đề xuất hôm nay</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {todayRecommendation ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-2xl font-semibold lowercase">{todayRecommendation.rootWord.root}</p>
                  <Badge variant="success">Đề xuất hôm nay</Badge>
                </div>
                <p className="text-sm text-[color:var(--muted-foreground)]">{todayRecommendation.rootWord.meaning}</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold">Chưa có root từ nào được chọn cho hôm nay.</p>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Chỉ root word đã xuất bản mới có thể hiển thị ở màn Hôm nay.
                </p>
              </>
            )}
          </div>

          <p className="max-w-md text-sm leading-6 text-[color:var(--muted-foreground)]">
            Admin có thể chọn nhanh một root word đã xuất bản để thay learning card chính trên <strong>/today</strong>{" "}
            trong ngày hiện tại.
          </p>
        </CardContent>
      </Card>

      <form className="grid gap-3 rounded-[18px] border border-[color:var(--border)] bg-white p-4 md:grid-cols-[1fr_180px_auto]">
        <input
          name="q"
          defaultValue={query}
          placeholder="Tìm root word..."
          className="h-10 rounded-[12px] border border-[color:var(--border)] px-3 text-sm"
        />
        <select
          name="published"
          defaultValue={published}
          className="h-10 rounded-[12px] border border-[color:var(--border)] px-3 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="draft">Bản nháp</option>
        </select>
        <button type="submit" className="rounded-[12px] bg-[color:var(--primary)] px-4 text-sm font-semibold text-white">
          Lọc
        </button>
      </form>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Bảng quản lý root word</CardTitle>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              Hiển thị {visibleRangeStart}-{visibleRangeEnd} trên {totalCount} root word.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rootWords.length === 0 ? (
            <EmptyState
              title="Chưa có root word phù hợp"
              description="Hãy đổi bộ lọc hoặc tạo thêm root word mới để bắt đầu quản lý nội dung."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Root</TableHead>
                    <TableHead>Nghĩa</TableHead>
                    <TableHead>Cấp độ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Số từ</TableHead>
                    <TableHead>Cập nhật lần cuối</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rootWords.map((rootWord) => {
                    const isTodayRecommended = todayRecommendation?.rootWordId === rootWord.id;
                    const wordCount = rootWord.words[0]?.count ?? 0;

                    return (
                      <TableRow key={rootWord.id}>
                        <TableCell>
                          <div className="space-y-2">
                            <Link href={`/admin/roots/${rootWord.id}`} className="text-base font-semibold lowercase text-[color:var(--foreground)]">
                              {rootWord.root}
                            </Link>
                            {rootWord.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {rootWord.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                                {rootWord.tags.length > 3 ? <Badge variant="outline">+{rootWord.tags.length - 3}</Badge> : null}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[18rem]">
                          <p className="line-clamp-2 text-sm text-[color:var(--muted-foreground)]">{rootWord.meaning}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rootWord.level}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={rootWord.is_published ? "success" : "outline"}>
                              {rootWord.is_published ? "Đã xuất bản" : "Bản nháp"}
                            </Badge>
                            {isTodayRecommended ? <Badge variant="success">Đề xuất hôm nay</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">{wordCount}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-[color:var(--muted-foreground)]">
                          {formatUpdatedAt(rootWord.updated_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/roots/${rootWord.id}`}>Xem chi tiết</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/root-words/new?edit=${rootWord.id}`}>
                                <PencilLine className="size-4" />
                                Chỉnh sửa
                              </Link>
                            </Button>
                            {rootWord.is_published ? (
                              <form action={setTodayRecommendedRootWordAction.bind(null, rootWord.id)}>
                                <Button type="submit" variant={isTodayRecommended ? "accent" : "outline"} size="sm" disabled={isTodayRecommended}>
                                  {isTodayRecommended ? "Đang đề xuất" : "Đặt cho hôm nay"}
                                </Button>
                              </form>
                            ) : (
                              <Button type="button" variant="outline" size="sm" disabled>
                                Cần xuất bản
                              </Button>
                            )}
                            <form action={deleteRootWordAction.bind(null, rootWord.id)}>
                              <Button type="submit" variant="ghost" size="sm">
                                <Trash2 className="size-4" />
                                Xóa
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 ? (
                <nav
                  aria-label="Phân trang root word admin"
                  className="flex flex-col gap-4 rounded-[20px] border border-[color:var(--border)] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                    Hiển thị {visibleRangeStart}-{visibleRangeEnd} trên {totalCount} root word
                  </p>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {currentPage > 1 ? (
                      <Button asChild variant="outline" className="h-10 rounded-[12px] px-4">
                        <Link
                          href={buildAdminRootWordsHref({
                            query,
                            published,
                            page: currentPage - 1,
                          })}
                        >
                          <ChevronLeft className="size-4" />
                          Trước
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="h-10 rounded-[12px] px-4" disabled>
                        <ChevronLeft className="size-4" />
                        Trước
                      </Button>
                    )}

                    <div className="inline-flex h-10 min-w-[7rem] items-center justify-center rounded-[12px] bg-[color:var(--muted)] px-4 text-sm font-semibold text-[color:var(--foreground)]">
                      Trang {currentPage}/{totalPages}
                    </div>

                    {currentPage < totalPages ? (
                      <Button asChild variant="outline" className="h-10 rounded-[12px] px-4">
                        <Link
                          href={buildAdminRootWordsHref({
                            query,
                            published,
                            page: currentPage + 1,
                          })}
                        >
                          Sau
                          <ChevronRight className="size-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="h-10 rounded-[12px] px-4" disabled>
                        Sau
                        <ChevronRight className="size-4" />
                      </Button>
                    )}
                  </div>
                </nav>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
