import { Crown } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarFallback } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils/cn";
import type { RankingPodiumEntry } from "@/features/ranking/types";

interface RankingPodiumProps {
  entries: RankingPodiumEntry[];
}

const podiumSlots = [
  {
    rank: 2,
    orderClassName: "md:order-1 md:translate-y-10",
    cardClassName: "border-[#d6dbe0] bg-[linear-gradient(180deg,#eef2f5_0%,#ffffff_66%)]",
    avatarClassName: "size-20 border-[#cbd5e1]",
    valueClassName: "text-[#424754]",
    pillarClassName: "h-24 bg-[linear-gradient(180deg,#eff3f6_0%,#d7dde3_100%)]",
    badgeClassName: "bg-[#cbd5e1] text-white",
  },
  {
    rank: 1,
    orderClassName: "md:order-2 md:-translate-y-6",
    cardClassName: "border-[#ffd6bd] bg-[linear-gradient(180deg,#fff1df_0%,#ffffff_68%)]",
    avatarClassName: "size-28 border-[#994100]",
    valueClassName: "text-[#994100]",
    pillarClassName: "h-36 bg-[linear-gradient(180deg,#ffe5cf_0%,#ffc79f_100%)]",
    badgeClassName: "bg-[#994100] text-white",
  },
  {
    rank: 3,
    orderClassName: "md:order-3 md:translate-y-14",
    cardClassName: "border-[#ffd9c8] bg-[linear-gradient(180deg,#fff1ea_0%,#ffffff_66%)]",
    avatarClassName: "size-20 border-[#ffb690]",
    valueClassName: "text-[#424754]",
    pillarClassName: "h-20 bg-[linear-gradient(180deg,#ffece1_0%,#ffd1b6_100%)]",
    badgeClassName: "bg-[#ffb690] text-[#341100]",
  },
];

export function RankingPodium({ entries }: RankingPodiumProps) {
  const entriesByRank = new Map(entries.map((entry) => [entry.rank, entry]));

  return (
    <section className="grid gap-4 md:grid-cols-3 md:items-end">
      {podiumSlots.map((slot) => {
        const entry = entriesByRank.get(slot.rank);

        return (
          <article key={slot.rank} className={cn("flex flex-col justify-end", slot.orderClassName)}>
            <div className={cn("relative rounded-[28px] border px-5 pt-7 text-center shadow-[0_20px_40px_rgba(15,23,42,0.08)]", slot.cardClassName)}>
              {slot.rank === 1 ? (
                <div className="mb-4 flex justify-center text-[#994100]">
                  <Crown className="size-6" />
                </div>
              ) : null}

              <div className="relative mx-auto w-fit">
                <Avatar className={cn("border-2 bg-white", slot.avatarClassName)}>
                  {entry?.avatarUrl ? <AvatarImage src={entry.avatarUrl} alt={entry.username} /> : null}
                  <AvatarFallback>{getAvatarFallback(entry?.username ?? `Hạng ${slot.rank}`)}</AvatarFallback>
                </Avatar>
                <span className={cn("absolute -bottom-2 right-0 inline-flex size-10 items-center justify-center rounded-full text-base font-bold shadow-sm", slot.badgeClassName)}>
                  {slot.rank}
                </span>
              </div>

              <div className="pb-6 pt-5">
                <p className={cn("truncate [font-family:var(--font-display)] font-extrabold text-[#191c1e]", slot.rank === 1 ? "text-2xl" : "text-xl")}>
                  {entry?.username ?? `Hạng #${slot.rank}`}
                </p>
                <p className={cn("mt-2 text-sm font-semibold", slot.valueClassName)}>{entry?.valueLabel ?? "Chưa có điểm"}</p>
              </div>

              <div className={cn("rounded-t-[20px]", slot.pillarClassName)} />
            </div>
          </article>
        );
      })}
    </section>
  );
}
