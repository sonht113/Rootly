import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LibraryRootCard } from "@/features/root-words/components/library-root-card";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAdminRootWordsPath, getRoleRootsPath } from "@/lib/navigation/role-routes";
import { cn } from "@/lib/utils/cn";
import { getPaginatedLibraryRootWords } from "@/server/repositories/root-words-repository";

const levelFilters = [
  { label: "Tất cả", value: "" },
  { label: "Cơ bản", value: "basic" },
  { label: "Trung cấp", value: "intermediate" },
  { label: "Nâng cao", value: "advanced" },
] as const;

const ADMIN_ROOTS_PAGE_SIZE = 10;

function parsePageValue(rawPage?: string) {
  const parsed = Number.parseInt(rawPage ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildRootsHref({
  basePath,
  query,
  level,
  page,
}: {
  basePath: string;
  query: string;
  level: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (level) {
    params.set("level", level);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const nextQuery = params.toString();
  return nextQuery ? `${basePath}?${nextQuery}` : basePath;
}

export default async function AdminRootsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const normalizedLevel = (params.level ?? "").toLowerCase();
  const activeLevel = levelFilters.some((filter) => filter.value === normalizedLevel) ? normalizedLevel : "";
  const requestedPage = parsePageValue(params.page);
  const profile = await getCurrentProfile();
  const rootsPath = getRoleRootsPath(profile?.role ?? "admin");
  const { items: rootWords, totalCount, totalPages, currentPage, pageSize } = await getPaginatedLibraryRootWords({
    query: query || undefined,
    level: activeLevel || undefined,
    userId: profile?.auth_user_id ?? null,
    page: requestedPage,
    pageSize: ADMIN_ROOTS_PAGE_SIZE,
  });

  const buildFilterHref = (nextLevel: string) =>
    buildRootsHref({
      basePath: rootsPath,
      query,
      level: nextLevel,
      page: 1,
    });

  const buildPageHref = (nextPage: number) =>
    buildRootsHref({
      basePath: rootsPath,
      query,
      level: activeLevel,
      page: nextPage,
    });

  const visibleRangeStart = rootWords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleRangeEnd = rootWords.length > 0 ? visibleRangeStart + rootWords.length - 1 : 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-[#e0edff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0058be]">
            Bản đồ từ gốc
          </div>
          <div className="space-y-3">
            <h1 className="max-w-[34rem] font-[family:var(--font-display)] text-[2.4rem] leading-[1.04] font-extrabold tracking-[-0.03em] text-[#191c1e] md:text-[2.9rem]">
              Duyệt root word theo cụm nghĩa và mở nhanh hồ sơ chi tiết
            </h1>
            <p className="max-w-[38rem] text-base leading-7 text-[#424754]">
              Trang này dành cho admin để rà nội dung đang publish, kiểm tra word families theo từng root và đi vào trang
              chi tiết trước khi chỉnh sửa ở khu vực quản lý.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
          <Button asChild className="h-11 rounded-[12px] bg-[#0058be] px-5 text-sm font-semibold text-white hover:bg-[#004ca6]">
            <Link href={getAdminRootWordsPath()}>
              Quản lý root word
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>

          <div className="w-full rounded-[12px] bg-[#f2f4f6] p-1.5 lg:w-auto">
            <div className="flex flex-wrap items-center gap-1.5">
              {levelFilters.map((filter) => {
                const isActive = filter.value === activeLevel;

                return (
                  <Link
                    key={filter.label}
                    href={buildFilterHref(filter.value)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-9 items-center justify-center rounded-[8px] px-4 py-2 text-sm leading-5 transition-colors",
                      isActive
                        ? "bg-white font-semibold text-[#0058be] shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                        : "font-medium text-[#424754] hover:bg-white/70",
                    )}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <form className="grid gap-3 rounded-[20px] border border-[color:var(--border)] bg-white p-4 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          <Input name="q" defaultValue={query} placeholder="Tìm root word, nghĩa hoặc mô tả..." className="h-11 pl-10" />
        </div>
        {activeLevel ? <input type="hidden" name="level" value={activeLevel} /> : null}
        <Button type="submit" className="h-11 rounded-[14px] px-5">
          Tìm kiếm
        </Button>
      </form>

      {rootWords.length === 0 ? (
        <EmptyState
          title="Không tìm thấy root word phù hợp"
          description="Hãy thử từ khóa khác hoặc bỏ bộ lọc cấp độ hiện tại để xem thêm các hồ sơ root word."
        />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rootWords.map((rootWord) => (
              <LibraryRootCard key={rootWord.id} rootWord={rootWord} hrefBase={rootsPath} ctaLabel="Xem chi tiết" />
            ))}
          </section>

          {totalPages > 1 ? (
            <nav
              aria-label="Phân trang danh sách root word admin"
              className="flex flex-col gap-4 rounded-[20px] border border-[color:var(--border)] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm leading-6 text-[#424754]">
                Hiển thị {visibleRangeStart}-{visibleRangeEnd} trên {totalCount} root word
              </p>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {currentPage > 1 ? (
                  <Button asChild variant="outline" className="h-10 rounded-[12px] border-[#dbe5f0] px-4">
                    <Link href={buildPageHref(currentPage - 1)}>
                      <ChevronLeft className="size-4" />
                      Trước
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="h-10 rounded-[12px] border-[#dbe5f0] px-4" disabled>
                    <ChevronLeft className="size-4" />
                    Trước
                  </Button>
                )}

                <div className="inline-flex h-10 min-w-[7rem] items-center justify-center rounded-[12px] bg-[#f2f4f6] px-4 text-sm font-semibold text-[#191c1e]">
                  Trang {currentPage}/{totalPages}
                </div>

                {currentPage < totalPages ? (
                  <Button asChild variant="outline" className="h-10 rounded-[12px] border-[#dbe5f0] px-4">
                    <Link href={buildPageHref(currentPage + 1)}>
                      Sau
                      <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="h-10 rounded-[12px] border-[#dbe5f0] px-4" disabled>
                    Sau
                    <ChevronRight className="size-4" />
                  </Button>
                )}
              </div>
            </nav>
          ) : null}
        </div>
      )}
    </div>
  );
}
