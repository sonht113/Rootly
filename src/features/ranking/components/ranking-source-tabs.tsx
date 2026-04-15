"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils/cn";
import type { RankingSource } from "@/types/domain";

const sourceOptions: Array<{ value: RankingSource; label: string }> = [
  { value: "activity", label: "Theo hoạt động" },
  { value: "exam", label: "Theo kỳ thi" },
];

export function RankingSourceTabs({ source }: { source: RankingSource }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateSource(nextSource: RankingSource) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSource === "activity") {
      params.delete("examId");
    } else {
      params.delete("metric");
      params.delete("period");
      params.delete("scope");
      params.delete("classId");
    }

    params.set("source", nextSource);
    const target = params.toString().length > 0 ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(target, { scroll: false });
    });
  }

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1 rounded-[12px] bg-[#e0e3e5] p-1", isPending && "opacity-70")}>
      {sourceOptions.map((option) => {
        const active = option.value === source;

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "rounded-[8px] px-4 py-2 text-xs font-bold transition-colors",
              active ? "bg-white text-[#0058be] shadow-sm" : "text-[#424754]",
            )}
            onClick={() => updateSource(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
