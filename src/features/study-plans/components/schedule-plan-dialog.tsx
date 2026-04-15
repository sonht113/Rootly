"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Check, Loader2, PlusCircle, Repeat2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStudyPlanAction, updateStudyPlanAction } from "@/features/study-plans/actions/plans";
import { cn } from "@/lib/utils/cn";
import { schedulePlanSchema } from "@/lib/validations/study-plans";

type SchedulePlanFormValues = z.input<typeof schedulePlanSchema>;
type RootWordOption = { id: string; root: string; meaning: string };
type SessionMode = "learn" | "review";
type ScheduleDateOption = { value: string; label: string };

const COPY = {
  defaultTrigger: "Thêm lịch học",
  createTitle: "Thêm vào lịch học",
  editTitle: "Chỉnh sửa lịch học",
  description:
    "Tìm từ gốc, chọn ngày học và thêm vào lịch học của bạn.",
  closeAriaLabel: "Đóng hộp thoại lịch học",
  rootLabel: "Tìm / chọn từ gốc",
  rootPlaceholder: "Tìm theo từ gốc hoặc nghĩa",
  noRoots: "Hãy xuất bản từ gốc trước để lên lịch học.",
  noSearchResult: "Không tìm thấy từ gốc phù hợp.",
  rootValidation: "Vui lòng chọn từ gốc từ danh sách.",
  fallbackMeaning: "Chưa có nghĩa",
  dateLabel: "Ngày học",
  datePlaceholder: "Chọn ngày học",
  dateValidation: "Vui lòng chọn ngày học hợp lệ.",
  sessionLabel: "Loại buổi học",
  learnMode: "Học mới",
  reviewMode: "Ôn tập",
  comingSoon: "Sắp có",
  reviewDisabled:
    "Chế độ ôn tập chưa được hỗ trợ trong lịch học này. Vui lòng chọn Học mới để tiếp tục.",
  reviewDisabledToast: "Chức năng ôn tập sẽ được hỗ trợ sau.",
  cancel: "Hủy",
  createSubmit: "Thêm vào lịch",
  editSubmit: "Lưu thay đổi",
  createSuccess: "Đã thêm vào lịch học.",
  updateSuccess: "Đã cập nhật lịch học.",
  createFailure: "Không thể thêm lịch học.",
  updateFailure: "Không thể cập nhật lịch học.",
} as const;

interface SchedulePlanDialogProps {
  rootWords: RootWordOption[];
  dateOptions?: ScheduleDateOption[];
  emptyStateMessage?: string;
  defaultValues?: {
    id?: string;
    rootWordId: string;
    scheduledDate: string;
    source: "manual" | "teacher_suggested" | "auto";
  };
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
  triggerIcon?: ReactNode;
  triggerAriaLabel?: string;
  disabled?: boolean;
}

export function SchedulePlanDialog({
  rootWords,
  dateOptions,
  emptyStateMessage = COPY.noRoots,
  defaultValues,
  triggerLabel = COPY.defaultTrigger,
  triggerVariant = "accent",
  triggerSize = "md",
  triggerClassName,
  triggerIcon,
  triggerAriaLabel,
  disabled = false,
}: SchedulePlanDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sessionMode, setSessionMode] = useState<SessionMode>("learn");
  const router = useRouter();
  const isEditing = Boolean(defaultValues?.id);

  const resolvedDefaults = useMemo(
    () => getSchedulePlanDefaults(defaultValues, rootWords, dateOptions),
    [dateOptions, defaultValues, rootWords],
  );
  const resolvedDateOptions = useMemo(
    () => getResolvedDateOptions(dateOptions, resolvedDefaults.scheduledDate),
    [dateOptions, resolvedDefaults.scheduledDate],
  );

  const form = useForm<SchedulePlanFormValues>({
    resolver: zodResolver(schedulePlanSchema),
    defaultValues: resolvedDefaults,
  });

  const selectedDateValue = form.watch("scheduledDate");
  const selectedRootWordId = form.watch("rootWordId");
  const selectedRootWord = useMemo(
    () => rootWords.find((rootWord) => rootWord.id === selectedRootWordId) ?? null,
    [rootWords, selectedRootWordId],
  );

  const filteredRootWords = useMemo(() => {
    if (rootWords.length === 0) {
      return [];
    }

    const query = normalizeSearch(searchTerm);

    if (!query) {
      return selectedRootWord ? [selectedRootWord] : rootWords.slice(0, 5);
    }

    if (selectedRootWord && normalizeSearch(selectedRootWord.root) === query) {
      return [selectedRootWord];
    }

    return rootWords
      .filter((rootWord) => {
        const rootMatch = normalizeSearch(rootWord.root).includes(query);
        const meaningMatch = normalizeSearch(rootWord.meaning).includes(query);
        return rootMatch || meaningMatch;
      })
      .slice(0, 6);
  }, [rootWords, searchTerm, selectedRootWord]);

  useEffect(() => {
    form.register("rootWordId");
    form.register("source");
  }, [form]);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(resolvedDefaults);
    setSessionMode("learn");

    const initialRootWord = rootWords.find((rootWord) => rootWord.id === resolvedDefaults.rootWordId) ?? null;
    setSearchTerm(initialRootWord?.root ?? "");
  }, [form, open, resolvedDefaults, rootWords]);

  function handleRootWordSelection(rootWord: RootWordOption) {
    setSearchTerm(rootWord.root);
    form.setValue("rootWordId", rootWord.id, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.clearErrors("rootWordId");
  }

  function handleSearchChange(nextValue: string) {
    setSearchTerm(nextValue);

    const exactMatch = rootWords.find((rootWord) => normalizeSearch(rootWord.root) === normalizeSearch(nextValue));
    form.setValue("rootWordId", exactMatch?.id ?? "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: Boolean(exactMatch),
    });

    if (exactMatch) {
      form.clearErrors("rootWordId");
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && filteredRootWords.length > 0) {
      event.preventDefault();
      handleRootWordSelection(filteredRootWords[0]);
    }

    if (event.key === "Escape" && selectedRootWord) {
      setSearchTerm(selectedRootWord.root);
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    if (sessionMode === "review") {
      toast.error(COPY.reviewDisabledToast);
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing && defaultValues?.id) {
          await updateStudyPlanAction({
            id: defaultValues.id,
            ...values,
          });
        } else {
          await createStudyPlanAction(values);
        }

        toast.success(isEditing ? COPY.updateSuccess : COPY.createSuccess);
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : isEditing
              ? COPY.updateFailure
              : COPY.createFailure,
        );
      }
    });
  });

  const isSubmitDisabled = disabled || isPending || rootWords.length === 0 || sessionMode === "review";
  const rootWordError = form.formState.errors.rootWordId ? COPY.rootValidation : null;
  const dateError = form.formState.errors.scheduledDate?.message ? COPY.dateValidation : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          aria-label={triggerAriaLabel}
          disabled={disabled}
        >
          {triggerIcon ?? <PlusCircle className="size-4" />}
          {triggerLabel}
        </Button>
      </DialogTrigger>

        <DialogContent className="w-[min(100%-2rem,512px)] gap-0 overflow-hidden rounded-[12px] border border-[#e7edf4] p-0 shadow-[0_30px_80px_rgba(15,23,42,0.18)] [&>button]:hidden">
        <DialogHeader className="border-b border-[#f1f4f7] px-8 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <DialogTitle className="font-[family:var(--font-display)] text-[1.75rem] leading-8 font-extrabold tracking-[-0.04em] text-[#191c1e]">
                {isEditing ? COPY.editTitle : COPY.createTitle}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {COPY.description}
              </DialogDescription>
            </div>

            <DialogClose asChild>
              <button
                type="button"
                aria-label={COPY.closeAriaLabel}
                className="flex size-9 items-center justify-center rounded-full text-[#424754] transition hover:bg-[#f2f4f6]"
              >
                <X className="size-4" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form className="px-8 pb-4 pt-0" onSubmit={onSubmit}>
          <input type="hidden" {...form.register("rootWordId")} />
          <input type="hidden" {...form.register("source")} />

          <div className="space-y-8 py-8">
            <div className="space-y-3">
              <Label htmlFor="rootWordSearch" className="text-sm font-bold leading-5 text-[#424754]">
                {COPY.rootLabel}
              </Label>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#424754]" />
                  <Input
                    id="rootWordSearch"
                    type="text"
                    value={searchTerm}
                    autoComplete="off"
                    placeholder={COPY.rootPlaceholder}
                    className="h-14 rounded-[8px] border-transparent bg-[#e0e3e5] pl-12 pr-4 text-base text-[#191c1e] shadow-none placeholder:text-[#6b7280] focus-visible:ring-[#bfd5ff]"
                    onChange={(event) => handleSearchChange(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                </div>

                <div className="rounded-[8px] bg-[#f2f4f6] p-2">
                  {rootWords.length === 0 ? (
                    <div className="rounded-[6px] bg-white px-4 py-4 text-sm leading-6 text-[#5b6472]">
                      {emptyStateMessage}
                    </div>
                  ) : filteredRootWords.length > 0 ? (
                    <div className="space-y-2">
                      {filteredRootWords.map((rootWord) => {
                        const isSelected = rootWord.id === selectedRootWord?.id;

                        return (
                          <button
                            key={rootWord.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-3 rounded-[6px] border bg-white px-3 py-3 text-left transition",
                              isSelected
                                ? "border-[#0058be1a] shadow-[0_8px_22px_rgba(0,88,190,0.06)]"
                                : "border-transparent hover:border-[#dbe5f0] hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)]",
                            )}
                            onClick={() => handleRootWordSelection(rootWord)}
                          >
                            <div
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-full",
                                isSelected ? "bg-[#6cf8bb] text-[#00714d]" : "bg-[#eef2f6] text-[#727785]",
                              )}
                            >
                              {isSelected ? <Check className="size-4" /> : <Search className="size-4" />}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-5 text-[#191c1e]">{rootWord.root}</p>
                              <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[#424754]">
                                {rootWord.meaning || COPY.fallbackMeaning}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[6px] bg-white px-4 py-4 text-sm leading-6 text-[#5b6472]">
                      {COPY.noSearchResult}
                    </div>
                  )}
                </div>

                {rootWordError ? <p className="text-sm text-[#ba1a1a]">{rootWordError}</p> : null}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold leading-5 text-[#424754]">
                {COPY.dateLabel}
              </Label>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#424754]" />
                <Select
                  value={selectedDateValue}
                  onValueChange={(value) =>
                    form.setValue("scheduledDate", value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className="h-14 rounded-[8px] border-transparent bg-[#e0e3e5] pl-12 pr-4 text-base text-[#191c1e] shadow-none focus:ring-[#bfd5ff]">
                    <SelectValue placeholder={COPY.datePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {resolvedDateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dateError ? <p className="text-sm text-[#ba1a1a]">{dateError}</p> : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-bold leading-5 text-[#424754]">{COPY.sessionLabel}</Label>
                {sessionMode === "review" ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#994100]">{COPY.comingSoon}</span>
                ) : null}
              </div>

              <div className="rounded-[12px] bg-[#e6e8ea] p-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-semibold transition",
                      sessionMode === "learn"
                        ? "bg-white text-[#0058be] shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                        : "text-[#5b6472] hover:bg-white/70",
                    )}
                    onClick={() => setSessionMode("learn")}
                  >
                    <Check className="size-4" />
                    <span>{COPY.learnMode}</span>
                  </button>

                  <button
                    type="button"
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-semibold transition",
                      sessionMode === "review"
                        ? "bg-white text-[#424754] shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                        : "text-[#5b6472] hover:bg-white/70",
                    )}
                    onClick={() => setSessionMode("review")}
                  >
                    <Repeat2 className="size-4" />
                    <span>{COPY.reviewMode}</span>
                  </button>
                </div>
              </div>

              {sessionMode === "review" ? (
                <p className="text-sm leading-6 text-[#5b6472]">{COPY.reviewDisabled}</p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[#c2c6d626] pt-4">
            <div className="grid grid-cols-2 gap-3">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-14 w-full rounded-[8px] text-base font-bold text-[#0058be] hover:bg-[#eef5ff] hover:text-[#0058be]"
                >
                  {COPY.cancel}
                </Button>
              </DialogClose>

              <Button
                type="submit"
                className="h-14 w-full rounded-[8px] bg-[#994100] text-base font-extrabold text-white shadow-none hover:bg-[#7f3600]"
                disabled={isSubmitDisabled}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>{isEditing ? COPY.editSubmit : COPY.createSubmit}</span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getSchedulePlanDefaults(
  defaultValues: SchedulePlanDialogProps["defaultValues"],
  rootWords: RootWordOption[],
  dateOptions?: ScheduleDateOption[],
): SchedulePlanFormValues {
  const resolvedDateOptions = getResolvedDateOptions(dateOptions, defaultValues?.scheduledDate);
  const preferredDate =
    defaultValues?.scheduledDate ??
    dateOptions?.find((option) => option.value === getTodayDateKey())?.value ??
    resolvedDateOptions[0]?.value ??
    getTodayDateKey();

  if (defaultValues) {
    return {
      rootWordId: defaultValues.rootWordId,
      scheduledDate: preferredDate,
      source: defaultValues.source,
    };
  }

  return {
    rootWordId: rootWords[0]?.id ?? "",
    scheduledDate: preferredDate,
    source: "manual",
  };
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function getResolvedDateOptions(dateOptions: ScheduleDateOption[] | undefined, selectedDate: string | undefined) {
  const normalizedOptions =
    dateOptions && dateOptions.length > 0
      ? [...dateOptions]
      : [
          {
            value: selectedDate ?? getTodayDateKey(),
            label: formatDateOptionLabel(selectedDate ?? getTodayDateKey()),
          },
        ];

  if (selectedDate && !normalizedOptions.some((option) => option.value === selectedDate)) {
    normalizedOptions.push({
      value: selectedDate,
      label: formatDateOptionLabel(selectedDate),
    });
  }

  return normalizedOptions;
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function formatDateOptionLabel(dateKey: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${dateKey}T00:00:00`));
}
