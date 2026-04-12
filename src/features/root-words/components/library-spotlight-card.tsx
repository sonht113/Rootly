import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RootLearningStatusBadge } from "@/features/root-words/components/root-learning-status-badge";
import { cn } from "@/lib/utils/cn";
import type { LibraryRootWord } from "@/server/repositories/root-words-repository";

interface LibrarySpotlightCardProps {
  rootWord: LibraryRootWord;
  className?: string;
}

function buildSpotlightTitle(rootWord: LibraryRootWord) {
  const rootLabel = rootWord.root.charAt(0).toUpperCase() + rootWord.root.slice(1);
  return `Khám phá ${rootLabel}: chiếc chìa khóa mở rộng vốn từ`;
}

function buildSpotlightDescription(rootWord: LibraryRootWord) {
  const description = rootWord.description.trim();
  if (description.length > 0) {
    return description;
  }

  return `Khám phá cách root "${rootWord.root}" tạo nên các từ liên quan và giúp bạn nhận ra quy luật trong tiếng Anh hằng ngày.`;
}

export function LibrarySpotlightCard({ rootWord, className }: LibrarySpotlightCardProps) {
  return (
    <article
      className={cn(
        "relative isolate overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#0058be_0%,#0d8a62_100%)] p-8 text-white shadow-[0_20px_48px_rgba(0,88,190,0.24)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.14),transparent_40%)]" />
      <div className="pointer-events-none absolute -bottom-10 right-4 font-[family:var(--font-display)] text-[8rem] font-extrabold lowercase tracking-[-0.08em] text-white/10">
        {rootWord.root}
      </div>

      <div className="relative flex h-full min-h-[328px] flex-col">
        <div className="space-y-5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-white/80">Gợi ý trong ngày</p>
          <RootLearningStatusBadge status={rootWord.learningStatus} className="bg-white/18 text-white backdrop-blur-sm" />
          <div className="max-w-[15rem] space-y-3">
            <h2 className="font-[family:var(--font-display)] text-[1.75rem] leading-[1.25] font-bold tracking-[-0.03em]">
              {buildSpotlightTitle(rootWord)}
            </h2>
            <div className="rounded-[18px] bg-white/20 p-4 backdrop-blur-sm">
              <p className="text-sm leading-[1.65] text-white/90">{buildSpotlightDescription(rootWord)}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <Link
            href={`/library/${rootWord.id}`}
            className="inline-flex h-12 items-center gap-3 rounded-[12px] bg-white px-6 text-base font-semibold text-[#006c49] transition-colors hover:bg-[#f2fff8]"
          >
            Học nhanh
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
