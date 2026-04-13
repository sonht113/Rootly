"use client";

import Link from "next/link";
import { addDays, addWeeks, format, subWeeks } from "date-fns";
import {
  ArrowUpRight,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  CircleDashed,
  Loader2,
  Repeat2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type MouseEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createStudyPlanAction, deleteStudyPlanAction } from "@/features/study-plans/actions/plans";
import { SchedulePlanDialog } from "@/features/study-plans/components/schedule-plan-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { getWeekRange } from "@/lib/utils/date";

interface CalendarPlannerProps {
  rootWords: Array<{ id: string; root: string; meaning: string }>;
  plans: Array<{
    id: string;
    scheduled_date: string;
    status: string;
    source: string;
    root_word: {
      id: string;
      root: string;
      meaning: string;
      level: string;
    };
  }>;
  reviews: Array<{
    id: string;
    review_date: string;
    status: string;
    review_step: number;
    root_word: {
      id: string;
      root: string;
      meaning: string;
    };
  }>;
}

type CalendarEntryTone =
  | "learning"
  | "review"
  | "overdue"
  | "done"
  | "completedOverdue"
  | "completedSuccess";
type QuickAddScheduleChoice = typeof NEXT_AVAILABLE_SLOT | string;
type QuickAddOption = {
  value: QuickAddScheduleChoice;
  label: string;
};
type ScheduleDialogDateOption = {
  value: string;
  label: string;
};
type SmartSuggestion = {
  rootWordId: string;
  rootLabel: string;
  message: string;
  scheduleFor: QuickAddScheduleChoice;
};

type CalendarEntry =
  | {
      id: string;
      kind: "plan";
      dateKey: string;
      label: string;
      meta: string;
      tone: CalendarEntryTone;
      title: string;
      rootWordId: string;
      description: string;
      defaultValues: {
        id: string;
        rootWordId: string;
        scheduledDate: string;
        source: "manual" | "teacher_suggested" | "auto";
      };
    }
  | {
      id: string;
      kind: "review";
      dateKey: string;
      label: string;
      meta: string;
      tone: CalendarEntryTone;
      title: string;
      rootWordId: string;
      description: string;
    };

const NEXT_AVAILABLE_SLOT = "__next_available__";

const TONE_STYLES: Record<
  CalendarEntryTone,
  {
    card: string;
    icon: string;
    meta: string;
    secondaryAction: string;
  }
> = {
  learning: {
    card: "bg-[#2170e4] text-[#fefcff] shadow-[0_16px_30px_rgba(33,112,228,0.24)]",
    icon: "text-[#fefcff]",
    meta: "bg-white/14 text-[#fefcff]",
    secondaryAction: "text-[#fefcff] hover:bg-white/12",
  },
  review: {
    card: "bg-[#6cf8bb] text-[#00714d] shadow-[0_14px_28px_rgba(16,185,129,0.18)]",
    icon: "text-[#00714d]",
    meta: "bg-white/55 text-[#00714d]",
    secondaryAction: "text-[#00714d] hover:bg-white/65",
  },
  overdue: {
    card: "border border-[#ba1a1a] bg-[#ffdad6] text-[#93000a] shadow-[0_16px_28px_rgba(186,26,26,0.08)]",
    icon: "text-[#93000a]",
    meta: "bg-white/70 text-[#93000a]",
    secondaryAction: "text-[#93000a] hover:bg-white/72",
  },
  completedOverdue: {
    card: "border border-[#f6d36f] bg-[#fff4c2] text-[#7a5800] shadow-[0_16px_28px_rgba(184,134,11,0.16)]",
    icon: "text-[#7a5800]",
    meta: "bg-white/80 text-[#7a5800]",
    secondaryAction: "text-[#7a5800] hover:bg-white/70",
  },
  completedSuccess: {
    card: "border border-[#86d19a] bg-[#dff7e5] text-[#146534] shadow-[0_16px_28px_rgba(22,101,52,0.14)]",
    icon: "text-[#146534]",
    meta: "bg-white/75 text-[#146534]",
    secondaryAction: "text-[#146534] hover:bg-white/72",
  },
  done: {
    card: "border border-[#dbe5f0] bg-white text-[#191c1e] shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
    icon: "text-[#2563eb]",
    meta: "bg-[#f2f4f6] text-[#5b6472]",
    secondaryAction: "text-[#5b6472] hover:bg-[#f2f4f6]",
  },
};

export function CalendarPlanner({ rootWords, plans, reviews }: CalendarPlannerProps) {
  const router = useRouter();
  const quickAddPanelRef = useRef<HTMLDivElement>(null);
  const [anchorDate, setAnchorDate] = useState(getCalendarToday);
  const [quickAddRootWordId, setQuickAddRootWordId] = useState(() => rootWords[0]?.id ?? "");
  const [quickAddScheduleFor, setQuickAddScheduleFor] = useState<QuickAddScheduleChoice>(NEXT_AVAILABLE_SLOT);
  const [isQuickAddPending, startQuickAddTransition] = useTransition();
  const weekRange = getWeekRange(anchorDate);
  const todayKey = getCalendarTodayKey();

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekRange.start, index);
        return {
          date,
          dateKey: format(date, "yyyy-MM-dd"),
        };
      }),
    [weekRange.start],
  );
  const visibleDateKeys = useMemo(() => new Set(days.map((day) => day.dateKey)), [days]);
  const plansInView = useMemo(
    () => plans.filter((plan) => visibleDateKeys.has(plan.scheduled_date)),
    [plans, visibleDateKeys],
  );
  const weeklyPlanLookup = useMemo(
    () => new Set(plansInView.map((plan) => `${plan.root_word.id}:${plan.scheduled_date}`)),
    [plansInView],
  );
  const plannedRootIdsInView = useMemo(() => new Set(plansInView.map((plan) => plan.root_word.id)), [plansInView]);
  const prioritizedRootWords = useMemo(() => {
    const unplanned = rootWords.filter((rootWord) => !plannedRootIdsInView.has(rootWord.id));
    const planned = rootWords.filter((rootWord) => plannedRootIdsInView.has(rootWord.id));
    return [...unplanned, ...planned];
  }, [plannedRootIdsInView, rootWords]);
  const miniLibraryRoots = useMemo(() => prioritizedRootWords.slice(0, 5), [prioritizedRootWords]);

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEntry[]>();

    for (const plan of plans) {
      const tone = getPlanTone(plan.status, plan.scheduled_date, todayKey);
      const entry: CalendarEntry = {
        id: plan.id,
        kind: "plan",
        dateKey: plan.scheduled_date,
        label: getPlanLabel(plan.status, tone),
        meta: getPlanMeta(plan.source, plan.status),
        tone,
        title: plan.root_word.root,
        rootWordId: plan.root_word.id,
        description: plan.root_word.meaning,
        defaultValues: {
          id: plan.id,
          rootWordId: plan.root_word.id,
          scheduledDate: plan.scheduled_date,
          source: plan.source as "manual" | "teacher_suggested" | "auto",
        },
      };

      const existing = grouped.get(plan.scheduled_date) ?? [];
      existing.push(entry);
      grouped.set(plan.scheduled_date, existing);
    }

    for (const review of reviews) {
      const tone = getReviewTone(review.status, review.review_date, todayKey);
      const entry: CalendarEntry = {
        id: review.id,
        kind: "review",
        dateKey: review.review_date,
        label: getReviewLabel(review.status, tone),
        meta: `Bước ${review.review_step}`,
        tone,
        title: review.root_word.root,
        rootWordId: review.root_word.id,
        description: review.root_word.meaning,
      };

      const existing = grouped.get(review.review_date) ?? [];
      existing.push(entry);
      grouped.set(review.review_date, existing);
    }

    for (const [dateKey, entries] of grouped) {
      grouped.set(
        dateKey,
        [...entries].sort((entryA, entryB) => {
          const toneOrder = getToneOrder(entryA.tone) - getToneOrder(entryB.tone);
          if (toneOrder !== 0) {
            return toneOrder;
          }

          if (entryA.kind !== entryB.kind) {
            return entryA.kind === "plan" ? -1 : 1;
          }

          return entryA.title.localeCompare(entryB.title);
        }),
      );
    }

    return grouped;
  }, [plans, reviews, todayKey]);

  const weekLabel = formatWeekLabel(weekRange.start, weekRange.end);
  const currentWeekStartKey = format(getWeekRange(getCalendarToday()).start, "yyyy-MM-dd");
  const isCurrentWeek = format(weekRange.start, "yyyy-MM-dd") === currentWeekStartKey;
  const quickAddSelectedRoot = rootWords.find((rootWord) => rootWord.id === quickAddRootWordId) ?? null;
  const resolvedQuickAddDate = quickAddSelectedRoot
    ? resolveQuickAddDate(quickAddRootWordId, quickAddScheduleFor, days, weeklyPlanLookup)
    : null;
  const quickAddOptions = useMemo<QuickAddOption[]>(
    () => [
      { value: NEXT_AVAILABLE_SLOT, label: "Khung trống gần nhất" },
      ...days.map(({ date, dateKey }) => ({
        value: dateKey,
        label: formatShortDateLabel(date),
      })),
    ],
    [days],
  );
  const scheduleDialogDateOptions = useMemo<ScheduleDialogDateOption[]>(
    () =>
      days.map(({ dateKey }) => ({
        value: dateKey,
        label: formatScheduleDialogDateOption(dateKey),
      })),
    [days],
  );
  const smartSuggestion = useMemo<SmartSuggestion | null>(() => {
    const suggestedRoot = prioritizedRootWords[0];
    if (!suggestedRoot) {
      return null;
    }

    const tomorrowKey = format(addDays(getCalendarToday(), 1), "yyyy-MM-dd");
    if (visibleDateKeys.has(tomorrowKey) && !weeklyPlanLookup.has(`${suggestedRoot.id}:${tomorrowKey}`)) {
      return {
        rootWordId: suggestedRoot.id,
        rootLabel: suggestedRoot.root,
        message: `Dựa trên tuần hiện tại, hãy lên lịch cho "${suggestedRoot.root}" vào ngày mai.`,
        scheduleFor: tomorrowKey,
      };
    }

    const suggestedDate = getNextAvailableDateKey(suggestedRoot.id, days, weeklyPlanLookup);
    return {
      rootWordId: suggestedRoot.id,
      rootLabel: suggestedRoot.root,
      message: `Dựa trên tuần hiện tại, hãy lên lịch cho "${suggestedRoot.root}" vào ${formatDateKeyLabel(suggestedDate)}.`,
      scheduleFor: suggestedDate,
    };
  }, [days, prioritizedRootWords, visibleDateKeys, weeklyPlanLookup]);

  useEffect(() => {
    if (quickAddRootWordId && rootWords.some((rootWord) => rootWord.id === quickAddRootWordId)) {
      return;
    }

    setQuickAddRootWordId(prioritizedRootWords[0]?.id ?? rootWords[0]?.id ?? "");
  }, [prioritizedRootWords, quickAddRootWordId, rootWords]);

  useEffect(() => {
    if (quickAddScheduleFor === NEXT_AVAILABLE_SLOT) {
      return;
    }

    if (!days.some((day) => day.dateKey === quickAddScheduleFor)) {
      setQuickAddScheduleFor(NEXT_AVAILABLE_SLOT);
    }
  }, [days, quickAddScheduleFor]);

  async function handleDelete(planId: string) {
    try {
      await deleteStudyPlanAction(planId);
      toast.success("Đã xóa lịch học");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa lịch học");
      throw error;
    }
  }

  function handlePrefillQuickAdd(rootWordId: string, scheduleFor: QuickAddScheduleChoice = NEXT_AVAILABLE_SLOT) {
    setQuickAddRootWordId(rootWordId);
    setQuickAddScheduleFor(scheduleFor);
    quickAddPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function handleQuickAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quickAddRootWordId) {
      toast.error("Hãy chọn từ gốc trước khi lên lịch.");
      return;
    }

    const scheduledDate = resolveQuickAddDate(quickAddRootWordId, quickAddScheduleFor, days, weeklyPlanLookup);
    const selectedRoot = rootWords.find((rootWord) => rootWord.id === quickAddRootWordId);

    if (
      quickAddScheduleFor !== NEXT_AVAILABLE_SLOT &&
      weeklyPlanLookup.has(`${quickAddRootWordId}:${scheduledDate}`)
    ) {
      toast.error(`${selectedRoot?.root ?? "Từ gốc này"} đã được lên lịch cho ngày đó.`);
      return;
    }

    startQuickAddTransition(async () => {
      await createStudyPlanAction({
        rootWordId: quickAddRootWordId,
        scheduledDate,
        source: "manual",
      });

      toast.success(`Đã lên lịch ${selectedRoot?.root ?? "từ gốc"} cho ${formatDateKeyLabel(scheduledDate)}.`);
      setQuickAddScheduleFor(NEXT_AVAILABLE_SLOT);
      router.refresh();
    });
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0 space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="font-[family:var(--font-display)] text-[2.15rem] leading-[1.05] font-extrabold tracking-[-0.04em] text-[#191c1e] md:text-[2.45rem]">
                Lịch học tuần
              </h1>
              <p className="max-w-[36rem] text-base leading-6 text-[#424754]">
                Quản lý hành trình học từ vựng của bạn trong {weekLabel}.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start lg:self-auto">
              <div className="inline-flex items-center rounded-[16px] bg-[#f2f4f6] p-1 shadow-[inset_0_0_0_1px_rgba(194,198,214,0.28)]">
                <button
                  type="button"
                  aria-label="Xem tuần trước"
                  className="flex size-9 items-center justify-center rounded-[12px] text-[#191c1e] transition hover:bg-white"
                  onClick={() => setAnchorDate((current) => subWeeks(current, 1))}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "min-w-[7.25rem] rounded-[12px] px-4 py-2 text-sm font-semibold transition",
                    isCurrentWeek ? "bg-white text-[#191c1e]" : "text-[#191c1e] hover:bg-white/75",
                  )}
                  onClick={() => setAnchorDate(getCalendarToday())}
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  aria-label="Xem tuần sau"
                  className="flex size-9 items-center justify-center rounded-[12px] text-[#191c1e] transition hover:bg-white"
                  onClick={() => setAnchorDate((current) => addWeeks(current, 1))}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              <div className="xl:hidden">
                <SchedulePlanDialog
                  rootWords={rootWords}
                  dateOptions={scheduleDialogDateOptions}
                  triggerLabel="Thêm lịch"
                  triggerVariant="outline"
                  triggerClassName="h-11 rounded-[16px] border-[#dbe5f0] bg-white px-4 text-[#191c1e] shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:bg-[#f8fbff]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[960px] grid-cols-7 gap-4 xl:min-w-0">
              {days.map(({ date, dateKey }) => (
                <CalendarDayColumn
                  key={dateKey}
                  date={date}
                  dateKey={dateKey}
                  entries={entriesByDate.get(dateKey) ?? []}
                  rootWords={rootWords}
                  dateOptions={scheduleDialogDateOptions}
                  todayKey={todayKey}
                  onDeletePlan={handleDelete}
                />
              ))}
            </div>
          </div>
        </div>

        <CalendarSideRail
          panelRef={quickAddPanelRef}
          rootWords={rootWords}
          quickAddRootWordId={quickAddRootWordId}
          quickAddScheduleFor={quickAddScheduleFor}
          quickAddOptions={quickAddOptions}
          quickAddResolvedDate={resolvedQuickAddDate}
          miniLibraryRoots={miniLibraryRoots}
          smartSuggestion={smartSuggestion}
          isPending={isQuickAddPending}
          onRootWordChange={setQuickAddRootWordId}
          onScheduleForChange={setQuickAddScheduleFor}
          onSubmit={handleQuickAddSubmit}
          onUseRoot={handlePrefillQuickAdd}
        />
      </div>
    </section>
  );
}

interface CalendarSideRailProps {
  panelRef: RefObject<HTMLDivElement | null>;
  rootWords: Array<{ id: string; root: string; meaning: string }>;
  quickAddRootWordId: string;
  quickAddScheduleFor: QuickAddScheduleChoice;
  quickAddOptions: QuickAddOption[];
  quickAddResolvedDate: string | null;
  miniLibraryRoots: Array<{ id: string; root: string; meaning: string }>;
  smartSuggestion: SmartSuggestion | null;
  isPending: boolean;
  onRootWordChange: (value: string) => void;
  onScheduleForChange: (value: QuickAddScheduleChoice) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseRoot: (rootWordId: string, scheduleFor?: QuickAddScheduleChoice) => void;
}

function CalendarSideRail({
  panelRef,
  rootWords,
  quickAddRootWordId,
  quickAddScheduleFor,
  quickAddOptions,
  quickAddResolvedDate,
  miniLibraryRoots,
  smartSuggestion,
  isPending,
  onRootWordChange,
  onScheduleForChange,
  onSubmit,
  onUseRoot,
}: CalendarSideRailProps) {
  return (
    <aside className="space-y-6 xl:sticky xl:top-6">
      <QuickAddPanel
        panelRef={panelRef}
        rootWords={rootWords}
        quickAddRootWordId={quickAddRootWordId}
        quickAddScheduleFor={quickAddScheduleFor}
        quickAddOptions={quickAddOptions}
        quickAddResolvedDate={quickAddResolvedDate}
        isPending={isPending}
        onRootWordChange={onRootWordChange}
        onScheduleForChange={onScheduleForChange}
        onSubmit={onSubmit}
      />
      <MiniLibraryPicker
        miniLibraryRoots={miniLibraryRoots}
        smartSuggestion={smartSuggestion}
        onUseRoot={onUseRoot}
      />
    </aside>
  );
}

interface QuickAddPanelProps {
  panelRef: RefObject<HTMLDivElement | null>;
  rootWords: Array<{ id: string; root: string; meaning: string }>;
  quickAddRootWordId: string;
  quickAddScheduleFor: QuickAddScheduleChoice;
  quickAddOptions: QuickAddOption[];
  quickAddResolvedDate: string | null;
  isPending: boolean;
  onRootWordChange: (value: string) => void;
  onScheduleForChange: (value: QuickAddScheduleChoice) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function QuickAddPanel({
  panelRef,
  rootWords,
  quickAddRootWordId,
  quickAddScheduleFor,
  quickAddOptions,
  quickAddResolvedDate,
  isPending,
  onRootWordChange,
  onScheduleForChange,
  onSubmit,
}: QuickAddPanelProps) {
  return (
    <div
      ref={panelRef}
      className="rounded-[24px] border border-[#edf1f5] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-[14px] bg-[#e0edff] text-[#0058be]">
          <CalendarPlus className="size-4" />
        </div>
        <h2 className="font-[family:var(--font-display)] text-[1.25rem] font-bold tracking-[-0.02em] text-[#191c1e]">
          Thêm nhanh
        </h2>
      </div>

      {rootWords.length > 0 ? (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#424754]">Từ gốc</label>
            <Select value={quickAddRootWordId} onValueChange={onRootWordChange}>
              <SelectTrigger className="h-11 border-transparent bg-[#e0e3e5] text-[#191c1e] shadow-none focus:ring-[#bfd5ff]">
                <SelectValue placeholder="Chọn từ gốc" />
              </SelectTrigger>
              <SelectContent>
                {rootWords.map((rootWord) => (
                  <SelectItem key={rootWord.id} value={rootWord.id}>
                    {rootWord.root} - {rootWord.meaning}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#424754]">Lên lịch cho</label>
            <Select value={quickAddScheduleFor} onValueChange={(value) => onScheduleForChange(value as QuickAddScheduleChoice)}>
              <SelectTrigger className="h-11 border-transparent bg-[#e0e3e5] text-[#191c1e] shadow-none focus:ring-[#bfd5ff]">
                <SelectValue placeholder="Chọn khung thời gian" />
              </SelectTrigger>
              <SelectContent>
                {quickAddOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {quickAddScheduleFor === NEXT_AVAILABLE_SLOT && quickAddResolvedDate ? (
              <p className="text-xs text-[#6b7280]">Sẽ xếp vào {formatDateKeyLabel(quickAddResolvedDate)}.</p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-[16px] bg-[#994100] text-white shadow-none hover:bg-[#7f3600]"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>Lên lịch mục học</span>
          </Button>
        </form>
      ) : (
        <div className="mt-6 rounded-[18px] bg-[#f2f4f6] p-4 text-sm leading-6 text-[#5b6472]">
          Hãy xuất bản một vài từ gốc trước để dùng tính năng lên lịch nhanh.
        </div>
      )}
    </div>
  );
}

interface MiniLibraryPickerProps {
  miniLibraryRoots: Array<{ id: string; root: string; meaning: string }>;
  smartSuggestion: SmartSuggestion | null;
  onUseRoot: (rootWordId: string, scheduleFor?: QuickAddScheduleChoice) => void;
}

function MiniLibraryPicker({ miniLibraryRoots, smartSuggestion, onUseRoot }: MiniLibraryPickerProps) {
  return (
    <div className="overflow-hidden rounded-[24px] bg-[#f2f4f6] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="space-y-2 px-6 pt-6">
        <h2 className="font-[family:var(--font-display)] text-[1.25rem] font-bold tracking-[-0.02em] text-[#191c1e]">
          Thư viện mini
        </h2>
        <p className="text-sm leading-5 text-[#424754]">Chạm vào bất kỳ từ gốc nào để đưa vào phần thêm nhanh.</p>
      </div>

      <div className="mt-2 space-y-3 px-4 pb-6">
        {miniLibraryRoots.length > 0 ? (
          miniLibraryRoots.map((rootWord) => (
            <button
              key={rootWord.id}
              type="button"
              className="flex w-full items-center justify-between rounded-[18px] bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
              onClick={() => onUseRoot(rootWord.id, NEXT_AVAILABLE_SLOT)}
            >
              <div className="min-w-0">
                <p className="text-base font-semibold leading-6 text-[#191c1e] lowercase">{rootWord.root}</p>
                <p className="mt-0.5 truncate text-[11px] leading-4 text-[#424754]">{rootWord.meaning}</p>
              </div>
              <span className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#f2f4f6] text-[#727785]">
                <ArrowUpRight className="size-4" />
              </span>
            </button>
          ))
        ) : (
          <div className="rounded-[18px] bg-white px-4 py-5 text-sm leading-6 text-[#5b6472]">
            Chưa có từ gốc đã xuất bản để hiển thị trong thư viện mini.
          </div>
        )}
      </div>

      <div className="border-t border-white/70 px-6 py-6">
        {smartSuggestion ? (
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0058be]">Gợi ý thông minh</p>
              <p className="text-sm leading-5 text-[#191c1e]">{smartSuggestion.message}</p>
            </div>
            <button
              type="button"
              aria-label={`Dùng gợi ý cho ${smartSuggestion.rootLabel}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-white text-[#0058be] transition hover:bg-[#e9f1ff]"
              onClick={() => onUseRoot(smartSuggestion.rootWordId, smartSuggestion.scheduleFor)}
            >
              <ArrowUpRight className="size-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0058be]">Gợi ý thông minh</p>
            <p className="text-sm leading-5 text-[#191c1e]">
              Tuần này đã được sắp xếp ổn. Bạn có thể thêm buổi ôn tập hoặc khám phá từ gốc khác.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CalendarDayColumnProps {
  date: Date;
  dateKey: string;
  entries: CalendarEntry[];
  rootWords: Array<{ id: string; root: string; meaning: string }>;
  dateOptions: ScheduleDialogDateOption[];
  todayKey: string;
  onDeletePlan: (planId: string) => Promise<void>;
}

function CalendarDayColumn({ date, dateKey, entries, rootWords, dateOptions, todayKey, onDeletePlan }: CalendarDayColumnProps) {
  const isSunday = date.getDay() === 0;
  const isToday = dateKey === todayKey;
  const dayLabelClassName = cn(
    "text-lg font-semibold leading-7 text-[#191c1e]",
    isSunday && "text-[#994100]",
    isToday && "text-[#2563eb]",
  );
  const addButtonDefaults =
    rootWords.length > 0
      ? {
          rootWordId: rootWords[0].id,
          scheduledDate: dateKey,
          source: "manual" as const,
        }
      : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div className="flex items-center gap-2">
          <p className={dayLabelClassName}>{formatWeekdayShortLabel(date)}</p>
          {isToday ? <span className="inline-flex size-2 rounded-full bg-[#2563eb]" /> : null}
        </div>
        <p className="text-xs font-medium text-[#424754]">{formatDayOfMonthLabel(date)}</p>
      </div>

      <div
        className={cn(
          "flex min-h-[23.5rem] flex-col rounded-[24px] bg-[#f2f4f6] p-3",
          isSunday && entries.length === 0 && "border border-[#c2c6d680] py-10",
        )}
      >
        {entries.length > 0 ? (
          <>
            <div className="flex flex-1 flex-col gap-3">
              {entries.map((entry) => (
                <CalendarEntryCard key={entry.id} entry={entry} onDeletePlan={onDeletePlan} />
              ))}
            </div>

            <div className="mt-3">
              <SchedulePlanDialog
                rootWords={rootWords}
                dateOptions={dateOptions}
                defaultValues={addButtonDefaults}
                triggerLabel=""
                triggerVariant="outline"
                triggerSize="icon"
                triggerAriaLabel={`Thêm lịch học cho ${formatLongDateLabel(date)}`}
                triggerIcon={<CalendarPlus className="size-4" />}
                triggerClassName="size-10 rounded-[14px] border-[#c2c6d6] bg-white/70 text-[#727785] hover:bg-white"
              />
            </div>
          </>
        ) : isSunday ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#fef3c7] text-[#994100]">
              <Sparkles className="size-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7c5b00]">Ngày bắt kịp</p>
            <p className="mt-3 max-w-[9rem] text-xs leading-5 text-[#727785]">
              Chưa có mục nào được lên lịch. Hãy dùng ngày này để xử lý các từ gốc bị quá hạn.
            </p>
            <SchedulePlanDialog
              rootWords={rootWords}
              dateOptions={dateOptions}
              defaultValues={addButtonDefaults}
              triggerLabel=""
              triggerVariant="outline"
              triggerSize="icon"
              triggerAriaLabel={`Thêm lịch học cho ${formatLongDateLabel(date)}`}
              triggerIcon={<CalendarPlus className="size-4" />}
              triggerClassName="mt-5 size-10 rounded-[14px] border-[#c2c6d6] bg-white text-[#727785] hover:bg-white"
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#727785]">
                <CircleDashed className="size-3.5" />
                <span>Khung trống</span>
              </div>
              <p className="max-w-[10rem] text-sm leading-6 text-[#727785]">
                Chưa có lịch học hoặc lịch ôn tập nào được lên trong ngày này.
              </p>
            </div>

            <SchedulePlanDialog
              rootWords={rootWords}
              dateOptions={dateOptions}
              defaultValues={addButtonDefaults}
              triggerLabel=""
              triggerVariant="outline"
              triggerSize="icon"
              triggerAriaLabel={`Thêm lịch học cho ${formatLongDateLabel(date)}`}
              triggerIcon={<CalendarPlus className="size-4" />}
              triggerClassName="size-10 rounded-[14px] border-[#c2c6d6] bg-white/70 text-[#727785] hover:bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface CalendarEntryCardProps {
  entry: CalendarEntry;
  onDeletePlan: (planId: string) => Promise<void>;
}

function CalendarEntryCard({ entry, onDeletePlan }: CalendarEntryCardProps) {
  const tone = TONE_STYLES[entry.tone];

  return (
    <article className={cn("rounded-[18px] p-3", tone.card)}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
        {getEntryIcon(entry)}
        <span>{entry.label}</span>
      </div>

      <div className="mt-3 space-y-1">
        <p className="break-words font-[family:var(--font-display)] text-lg leading-5 font-bold lowercase">
          {entry.title}
        </p>
        <p className="break-words text-xs leading-4 opacity-90">{entry.description}</p>
      </div>

      {entry.kind === "plan" ? (
        <div className="mt-4 grid gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn("h-8 w-full justify-center rounded-[10px]", tone.secondaryAction)}
          >
            <Link href={`/library/${entry.rootWordId}`}>Xem chi tiết</Link>
          </Button>
          <DeletePlanButton
            planId={entry.id}
            title={entry.title}
            className={tone.secondaryAction}
            onDeletePlan={onDeletePlan}
          />
        </div>
      ) : (
        <div className="mt-4">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn("h-8 w-full justify-center rounded-[10px]", tone.secondaryAction)}
          >
            <Link href={`/library/${entry.rootWordId}?reviewId=${entry.id}`}>Ôn tập</Link>
          </Button>
        </div>
      )}
    </article>
  );
}

interface DeletePlanButtonProps {
  planId: string;
  title: string;
  className: string;
  onDeletePlan: (planId: string) => Promise<void>;
}

function DeletePlanButton({ planId, title, className, onDeletePlan }: DeletePlanButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeletePending, startDeleteTransition] = useTransition();

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    startDeleteTransition(async () => {
      try {
        await onDeletePlan(planId);
        setOpen(false);
      } catch {}
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-full justify-center rounded-[10px]", className)}
          disabled={isDeletePending}
          aria-label={`Xóa lịch học cho ${title}`}
        >
          {isDeletePending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          <span>Xóa</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa lịch học này?</AlertDialogTitle>
          <AlertDialogDescription>
            Lịch học của từ gốc <strong>{title}</strong> sẽ bị xóa khỏi lịch tuần hiện tại. Bạn có thể thêm lại sau.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletePending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            className="bg-[color:var(--danger)] text-white hover:opacity-90"
            disabled={isDeletePending}
            onClick={handleConfirm}
          >
            {isDeletePending ? <Loader2 className="size-4 animate-spin" /> : null}
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function getEntryIcon(entry: CalendarEntry) {
  const iconClassName = cn("size-3.5 shrink-0", TONE_STYLES[entry.tone].icon);

  switch (entry.tone) {
    case "learning":
      return <Sparkles className={iconClassName} />;
    case "review":
      return <Repeat2 className={iconClassName} />;
    case "overdue":
      return <CircleAlert className={iconClassName} />;
    case "completedOverdue":
    case "completedSuccess":
    case "done":
      return <CircleCheckBig className={iconClassName} />;
    default:
      return <CircleDashed className={iconClassName} />;
  }
}

function getPlanTone(status: string, dateKey: string, todayKey: string): CalendarEntryTone {
  if (status === "completed") {
    return dateKey < todayKey ? "completedOverdue" : "completedSuccess";
  }

  if (status === "skipped") {
    return "done";
  }

  if (status === "overdue" || (dateKey < todayKey && status !== "completed")) {
    return "overdue";
  }

  return "learning";
}

function getReviewTone(status: string, dateKey: string, todayKey: string): CalendarEntryTone {
  if (status === "done") {
    return "done";
  }

  if (status === "missed" || (dateKey < todayKey && status !== "done")) {
    return "overdue";
  }

  return "review";
}

function getPlanLabel(status: string, tone: CalendarEntryTone) {
  if (tone === "overdue") {
    return "Quá hạn";
  }

  if (tone === "completedOverdue" || tone === "completedSuccess") {
    return "Đã hoàn thành";
  }

  if (status === "in_progress") {
    return "Đang học";
  }

  if (status === "skipped") {
    return "Bỏ qua";
  }

  return "Học mới";
}

function getReviewLabel(status: string, tone: CalendarEntryTone) {
  if (tone === "overdue") {
    return "Quá hạn";
  }

  if (status === "done") {
    return "Hoàn tất";
  }

  if (status === "rescheduled") {
    return "Dời lịch";
  }

  return "Ôn tập";
}

function getPlanMeta(source: string, status: string) {
  if (status === "completed") {
    return "Đã hoàn thành";
  }

  if (status === "in_progress") {
    return "Đang hoạt động";
  }

  if (status === "skipped") {
    return "Bỏ qua";
  }

  switch (source) {
    case "teacher_suggested":
      return "Giáo viên";
    case "auto":
      return "Tự động";
    default:
      return "Thủ công";
  }
}

function getToneOrder(tone: CalendarEntryTone) {
  switch (tone) {
    case "overdue":
      return 0;
    case "learning":
      return 1;
    case "review":
      return 2;
    case "completedOverdue":
    case "completedSuccess":
      return 3;
    case "done":
      return 4;
    default:
      return 5;
  }
}

function formatWeekLabel(start: Date, end: Date) {
  const startsInSameMonth = start.getMonth() === end.getMonth();

  if (startsInSameMonth) {
    return `${formatMonthDayLabel(start)} - ${formatDayOfMonthLabel(end)}`;
  }

  return `${formatMonthDayLabel(start)} - ${formatMonthDayLabel(end)}`;
}

function getCalendarTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function getCalendarToday() {
  return new Date(`${getCalendarTodayKey()}T00:00:00`);
}

function getNextAvailableDateKey(
  rootWordId: string,
  days: Array<{ date: Date; dateKey: string }>,
  weeklyPlanLookup: Set<string>,
) {
  const firstOpenDay = days.find((day) => !weeklyPlanLookup.has(`${rootWordId}:${day.dateKey}`));
  return firstOpenDay?.dateKey ?? days[days.length - 1]?.dateKey ?? getCalendarTodayKey();
}

function resolveQuickAddDate(
  rootWordId: string,
  scheduleFor: QuickAddScheduleChoice,
  days: Array<{ date: Date; dateKey: string }>,
  weeklyPlanLookup: Set<string>,
) {
  if (scheduleFor !== NEXT_AVAILABLE_SLOT) {
    return scheduleFor;
  }

  return getNextAvailableDateKey(rootWordId, days, weeklyPlanLookup);
}

function formatDateKeyLabel(dateKey: string) {
  return formatShortDateLabel(new Date(`${dateKey}T00:00:00`));
}

function formatWeekdayShortLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatDayOfMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatMonthDayLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatShortDateLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatLongDateLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatScheduleDialogDateOption(dateKey: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${dateKey}T00:00:00`));
}
