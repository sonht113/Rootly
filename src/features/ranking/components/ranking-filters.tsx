"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { getRankingMetricOptionLabel } from "@/lib/utils/ranking";
import type { RankingMetric, RankingPeriod, RankingScope } from "@/types/domain";

interface RankingFiltersProps {
  metric: RankingMetric;
  period: RankingPeriod;
  scope: RankingScope;
  classId?: string;
  classes: Array<{
    id: string;
    name: string;
  }>;
}

const scopeOptions = [
  { value: "all" as const, label: "Toàn hệ thống" },
  { value: "class" as const, label: "Lớp của tôi" },
];

const periodOptions = [
  { value: "today" as const, label: "Hôm nay" },
  { value: "week" as const, label: "Tuần này" },
  { value: "month" as const, label: "Tháng này" },
  { value: "all" as const, label: "Tất cả thời gian" },
];

const metricOptions: RankingMetric[] = ["root_words_learned", "words_learned", "reviews_completed", "streak"];

export function RankingFilters({ metric, period, scope, classId, classes }: RankingFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const hasClasses = classes.length > 0;

  function updateParams(nextValues: Partial<Record<"metric" | "period" | "scope" | "classId", string | undefined>>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(nextValues)) {
      if (!value) {
        params.delete(key);
        continue;
      }

      params.set(key, value);
    }

    const target = params.toString().length > 0 ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(target, { scroll: false });
    });
  }

  return (
    <section className={cn("rounded-[24px] bg-[#f2f4f6] p-4 transition-opacity md:p-5", isPending && "opacity-70")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <FilterSegment
          label="Phạm vi"
          options={scopeOptions}
          value={scope}
          onChange={(nextScope) => {
            if (nextScope === "class" && !hasClasses) {
              return;
            }

            updateParams({
              scope: nextScope,
              classId: nextScope === "class" ? classId ?? classes[0]?.id : undefined,
            });
          }}
          isOptionDisabled={(value) => value === "class" && !hasClasses}
        />

        <FilterSegment
          label="Thời gian"
          options={periodOptions}
          value={period}
          onChange={(nextPeriod) => {
            updateParams({ period: nextPeriod });
          }}
        />
      </div>

      <div className={cn("mt-4 grid gap-3", hasClasses && scope === "class" ? "md:grid-cols-[160px_minmax(0,1fr)]" : "md:max-w-[220px]")}>
        <Select
          value={metric}
          onValueChange={(nextMetric) => {
            updateParams({ metric: nextMetric });
          }}
        >
          <SelectTrigger className="h-11 rounded-[12px] border-transparent bg-white px-4 text-left text-sm font-semibold text-[#191c1e] shadow-none focus:ring-[#bfd5ff]">
            <SelectValue placeholder="Chọn chỉ số" />
          </SelectTrigger>
          <SelectContent>
            {metricOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {getRankingMetricOptionLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasClasses && scope === "class" ? (
          <Select
            value={classId ?? classes[0]?.id}
            onValueChange={(nextClassId) => {
              updateParams({ classId: nextClassId, scope: "class" });
            }}
          >
            <SelectTrigger className="h-11 rounded-[12px] border-transparent bg-white px-4 text-left text-sm font-semibold text-[#191c1e] shadow-none focus:ring-[#bfd5ff]">
              <SelectValue placeholder="Chọn lớp học" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((classItem) => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </section>
  );
}

function FilterSegment({
  label,
  options,
  value,
  onChange,
  isOptionDisabled,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  isOptionDisabled?: (value: string) => boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="sr-only">{label}</p>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-[12px] bg-[#e0e3e5] p-1">
        {options.map((option) => {
          const disabled = isOptionDisabled?.(option.value) ?? false;
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "rounded-[8px] px-4 py-2 text-xs font-bold transition-colors",
                active ? "bg-white text-[#0058be] shadow-sm" : "text-[#424754]",
                disabled && "cursor-not-allowed opacity-45",
              )}
              onClick={() => {
                if (!disabled) {
                  onChange(option.value);
                }
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
