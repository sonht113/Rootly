import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LibraryRootCard } from "@/features/root-words/components/library-root-card";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAdminRootWordsPath, getRoleRootsPath } from "@/lib/navigation/role-routes";
import { cn } from "@/lib/utils/cn";
import { getLibraryRootWords } from "@/server/repositories/root-words-repository";

const levelFilters = [
  { label: "Tất cả", value: "" },
  { label: "Cơ bản", value: "basic" },
  { label: "Trung cấp", value: "intermediate" },
  { label: "Nâng cao", value: "advanced" },
] as const;

export default async function RootsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const normalizedLevel = (params.level ?? "").toLowerCase();
  const activeLevel = levelFilters.some((filter) => filter.value === normalizedLevel) ? normalizedLevel : "";
  const profile = await getCurrentProfile();
  const rootsPath = getRoleRootsPath(profile?.role ?? "student");

  const rootWords = await getLibraryRootWords({
    query: query || undefined,
    level: activeLevel || undefined,
    userId: profile?.auth_user_id ?? null,
  });

  const buildFilterHref = (nextLevel: string) => {
    const nextParams = new URLSearchParams();

    if (query) {
      nextParams.set("q", query);
    }

    if (nextLevel) {
      nextParams.set("level", nextLevel);
    }

    const nextQuery = nextParams.toString();
    return nextQuery ? `${rootsPath}?${nextQuery}` : rootsPath;
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-[#e0edff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0058be]">
            Bản đồ từ gốc
          </div>
          <div className="space-y-3">
            <h1 className="max-w-[34rem] font-[family:var(--font-display)] text-[2.4rem] leading-[1.04] font-extrabold tracking-[-0.03em] text-[#191c1e] md:text-[2.9rem]">
              Khám phá những mảnh ghép cốt lõi đứng sau vốn từ tiếng Anh
            </h1>
            <p className="max-w-[38rem] text-base leading-7 text-[#424754]">
              Duyệt các hồ sơ từ gốc, so sánh các họ nghĩa và mở trang học tập chuyên sâu khi bạn muốn đưa một mẫu từ vào lịch học.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
          {profile?.role === "admin" ? (
            <Button asChild className="h-11 rounded-[12px] bg-[#0058be] px-5 text-sm font-semibold text-white hover:bg-[#004ca6]">
              <Link href={getAdminRootWordsPath()}>
                Quản lý & import nội dung
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          ) : null}

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
          <Input name="q" defaultValue={query} placeholder="Tìm từ gốc, nghĩa hoặc nguồn gốc..." className="h-11 pl-10" />
        </div>
        {activeLevel ? <input type="hidden" name="level" value={activeLevel} /> : null}
        <Button type="submit" className="h-11 rounded-[14px] px-5">
          Tìm kiếm
        </Button>
      </form>

      {rootWords.length === 0 ? (
        <EmptyState
          title="Không tìm thấy từ gốc phù hợp"
          description="Hãy thử từ khóa khác hoặc bỏ bộ lọc cấp độ hiện tại để mở ra thêm các hồ sơ từ gốc."
        />
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rootWords.map((rootWord) => (
            <LibraryRootCard key={rootWord.id} rootWord={rootWord} hrefBase={rootsPath} ctaLabel="Mở hồ sơ" />
          ))}
        </section>
      )}
    </div>
  );
}
