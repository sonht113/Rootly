"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarFallback } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils/cn";
import type { RankingLeaderboardEntry } from "@/features/ranking/types";

interface RankingListProps {
  previewEntries: RankingLeaderboardEntry[];
  allEntries: RankingLeaderboardEntry[];
  listHasOverflow: boolean;
  valueHeader?: string;
  emptyMessage?: string;
}

export function RankingList({
  previewEntries,
  allEntries,
  listHasOverflow,
  valueHeader = "ĐIỂM XP",
  emptyMessage = "Bảng xếp hạng sẽ xuất hiện ở đây khi có thêm dữ liệu học tập.",
}: RankingListProps) {
  const [showAll, setShowAll] = useState(false);
  const entries = showAll ? allEntries : previewEntries;

  return (
    <section className="overflow-hidden rounded-[24px] bg-white p-2 shadow-[var(--shadow-soft)]">
      <div className="hidden grid-cols-[96px_minmax(0,1fr)_136px_108px] items-end border-b border-[#f2f4f6] px-4 py-4 text-[10px] font-bold tracking-[0.12em] text-[#42475499] md:grid">
        <span>HẠNG</span>
        <span>NGƯỜI HỌC</span>
        <span>TRẠNG THÁI</span>
        <span className="text-right">{valueHeader}</span>
      </div>

      <div className="space-y-2 px-1 py-2 md:px-2 md:py-3">
        {entries.length === 0 ? (
          <div className="rounded-[18px] bg-[#f2f4f6] px-5 py-8 text-center text-sm text-[#424754]">
            {emptyMessage}
          </div>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.userId}
              className={cn(
                "rounded-[16px] border border-transparent bg-white px-4 py-4 transition-colors",
                entry.isCurrentUser && "bg-[#d8e2ff4d]",
              )}
            >
              <div className="flex items-start justify-between gap-3 md:hidden">
                <div className={cn("text-sm [font-family:var(--font-display)] font-extrabold", entry.isCurrentUser ? "text-[#0058be]" : "text-[#42475466]")}>
                  {entry.rankLabel}
                </div>
                <div className={cn("text-sm [font-family:var(--font-display)] font-bold", entry.isCurrentUser ? "text-[#0058be]" : "text-[#191c1e]")}>
                  {entry.valueLabel}
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3 md:mt-0 md:grid md:grid-cols-[96px_minmax(0,1fr)_136px_108px] md:items-center">
                <div className={cn("hidden text-sm [font-family:var(--font-display)] font-extrabold md:block", entry.isCurrentUser ? "text-[#0058be]" : "text-[#42475466]")}>
                  {entry.rankLabel}
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border border-[#0058be1a] bg-[#eceef0]">
                    {entry.avatarUrl ? <AvatarImage src={entry.avatarUrl} alt={entry.displayName} /> : null}
                    <AvatarFallback>{getAvatarFallback(entry.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm font-bold", entry.isCurrentUser ? "text-[#0058be]" : "text-[#191c1e]")}>
                      {entry.isCurrentUser ? `${entry.displayName} (Bạn)` : entry.displayName}
                    </p>
                  </div>
                </div>

                <div>
                  <span className={cn("inline-flex rounded-full px-3 py-1 text-[10px] font-bold", getStatusClasses(entry.statusTier))}>
                    {entry.statusLabel}
                  </span>
                </div>

                <div className={cn("text-sm [font-family:var(--font-display)] font-bold md:text-right", entry.isCurrentUser ? "text-[#0058be]" : "text-[#191c1e]")}>
                  {entry.valueLabel}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {listHasOverflow ? (
        <div className="border-t border-[#f2f4f6] px-4 py-5 text-center">
          <button
            type="button"
            className="text-xs font-bold tracking-[0.02em] text-[#0058be]"
            onClick={() => {
              setShowAll((current) => !current);
            }}
          >
            {showAll ? "Thu gọn bảng xếp hạng" : "Xem toàn bộ bảng xếp hạng"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function getStatusClasses(tier: RankingLeaderboardEntry["statusTier"]) {
  switch (tier) {
    case "polyglot":
      return "bg-[#6cf8bb] text-[#00714d]";
    case "curator":
      return "bg-[#2170e4] text-[#fefcff]";
    case "novice":
    default:
      return "bg-[#e0e3e5] text-[#424754]";
  }
}
