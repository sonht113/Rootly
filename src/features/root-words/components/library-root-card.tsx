import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { LibraryRootWord } from "@/server/repositories/root-words-repository";

interface LibraryRootCardProps {
  rootWord: LibraryRootWord;
  className?: string;
  hrefBase?: string;
  ctaLabel?: string;
}

export function LibraryRootCard({
  rootWord,
  className,
  hrefBase = "/library",
  ctaLabel = "Xem chi tiết",
}: LibraryRootCardProps) {
  const chipWords = rootWord.previewWords.length > 0 ? rootWord.previewWords : rootWord.tags.slice(0, 3);
  const overflowCount =
    rootWord.previewWords.length > 0
      ? rootWord.moreWordsCount
      : Math.max(0, rootWord.tags.length - rootWord.tags.slice(0, 3).length);

  return (
    <article
      className={cn(
        "flex min-h-[328px] flex-col rounded-[24px] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-[family:var(--font-display)] text-[1.875rem] leading-9 font-extrabold lowercase tracking-[-0.03em] text-[#0058be]">
            {rootWord.root}
          </h2>
          <p className="text-base font-medium leading-6 text-[#424754]">{rootWord.originLabel}</p>
        </div>

        <div className="text-right">
          <p className="text-[1.75rem] font-semibold leading-8 text-[#191c1e]">{rootWord.wordCount}</p>
          <p className="mt-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">SỐ TỪ</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {chipWords.map((word) => (
          <span key={word} className="rounded-[8px] bg-[#f2f4f6] px-3 py-1 text-xs font-medium leading-4 text-[#424754]">
            {word}
          </span>
        ))}
        {overflowCount > 0 ? (
          <span className="rounded-[8px] bg-[#f2f4f6] px-3 py-1 text-xs font-medium leading-4 text-[#424754]">
            +{overflowCount} mục
          </span>
        ) : null}
      </div>

      <div className="mt-auto space-y-4 pt-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[-0.04em] text-[#64748b]">
            <span>Tiến độ làm chủ</span>
            <span>{rootWord.masteryProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#e0e3e5]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#2ecf92_0%,#0058be_100%)] transition-[width]"
              style={{ width: `${rootWord.masteryProgress}%` }}
            />
          </div>
        </div>

        <Button asChild className="h-12 w-full rounded-[12px] bg-[#0058be] text-base font-semibold text-white hover:bg-[#004ca6]">
          <Link href={`${hrefBase}/${rootWord.id}`}>{ctaLabel}</Link>
        </Button>
      </div>
    </article>
  );
}
