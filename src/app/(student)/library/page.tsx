import Link from "next/link";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LibraryRootCard } from "@/features/root-words/components/library-root-card";
import { LibrarySpotlightCard } from "@/features/root-words/components/library-spotlight-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { getLibraryRootWords, type LibraryRootWord } from "@/server/repositories/root-words-repository";

const levelFilters = [
  { label: "Tất cả", value: "" },
  { label: "Cơ bản", value: "basic" },
  { label: "Trung cấp", value: "intermediate" },
  { label: "Nâng cao", value: "advanced" },
] as const;

function getFeaturedRootWord(rootWords: LibraryRootWord[]) {
  return [...rootWords].sort((left, right) => {
    const leftScore = left.wordCount * 4 + left.masteryProgress * 3 + left.previewWords.length * 5 + left.description.length;
    const rightScore =
      right.wordCount * 4 + right.masteryProgress * 3 + right.previewWords.length * 5 + right.description.length;

    return rightScore - leftScore;
  })[0] ?? null;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const normalizedLevel = (params.level ?? "").toLowerCase();
  const activeLevel = levelFilters.some((filter) => filter.value === normalizedLevel) ? normalizedLevel : "";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rootWords = await getLibraryRootWords({
    query: query || undefined,
    level: activeLevel || undefined,
    userId: user?.id ?? null,
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
    return nextQuery ? `/library?${nextQuery}` : "/library";
  };
  const featuredRootWord = getFeaturedRootWord(rootWords);
  const rankedRootWords = featuredRootWord ? rootWords.filter((rootWord) => rootWord.id !== featuredRootWord.id) : rootWords;
  const bentoRootWords = rankedRootWords.slice(0, 5);
  const remainingRootWords = rankedRootWords.slice(5);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-[#6cf8bb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00714d]">
            Kho tuyển chọn
          </div>
          <div className="space-y-3">
            <h1 className="max-w-[28rem] font-[family:var(--font-display)] text-[2.25rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-[#191c1e] md:text-[2.5rem]">
              Thư viện từ gốc
            </h1>
            <p className="max-w-[28rem] text-base leading-6 text-[#424754]">
              Nắm vững các mảnh ghép nền tảng của tiếng Anh. Khám phá từ nguyên theo cách học có hệ thống và dễ ghi nhớ.
            </p>
          </div>
        </div>

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
      </section>

      <form className="grid gap-3 rounded-[20px] border border-[color:var(--border)] bg-white p-4 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          <Input name="q" defaultValue={query} placeholder="Tìm từ gốc hoặc nghĩa..." className="h-11 pl-10" />
        </div>
        {activeLevel ? <input type="hidden" name="level" value={activeLevel} /> : null}
        <Button type="submit" className="h-11 rounded-[14px] px-5">
          Tìm kiếm
        </Button>
      </form>

      {rootWords.length === 0 ? (
        <EmptyState
          title="Không tìm thấy từ gốc phù hợp"
          description="Hãy thử từ khóa khác hoặc bỏ bộ lọc cấp độ hiện tại để xem thêm mục trong thư viện."
        />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-3">
            {bentoRootWords.map((rootWord) => (
              <LibraryRootCard key={rootWord.id} rootWord={rootWord} />
            ))}
            {featuredRootWord ? <LibrarySpotlightCard rootWord={featuredRootWord} /> : null}
          </section>

          {remainingRootWords.length > 0 ? (
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {remainingRootWords.map((rootWord) => (
                <LibraryRootCard key={rootWord.id} rootWord={rootWord} />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
