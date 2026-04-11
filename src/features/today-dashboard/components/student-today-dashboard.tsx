import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Flame, Sparkles, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import type { ReviewHighlightItem, TodayDashboardViewModel } from "@/features/today-dashboard/types";

function HeroIllustration() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className="h-24 w-auto text-slate-900 md:h-28">
      <path
        d="M34 24c0-6.6 5.4-12 12-12h56c16.6 0 30 13.4 30 30v44c0 12.2-9.8 22-22 22H46c-6.6 0-12-5.4-12-12V24Z"
        fill="currentColor"
        opacity="0.08"
      />
      <path
        d="M38 34c0-8.8 7.2-16 16-16h24c7.7 0 14 6.3 14 14v4c0 7.7-6.3 14-14 14H62c-5.5 0-10 4.5-10 10v4c0 8.8 7.2 16 16 16h26"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
      <path
        d="M88 78c0-9.9 8.1-18 18-18h8c6.6 0 12 5.4 12 12v2c0 15.5-12.5 28-28 28H84"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
      <circle cx="118" cy="34" r="10" fill="currentColor" />
    </svg>
  );
}

function ScholarPenIllustration() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="h-24 w-24 text-white/80">
      <path
        d="M76 14 104 42 58 88 34 94l6-24 36-56Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="8"
      />
      <path d="M70 22 96 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="8" />
      <path d="M30 100c11-8 21-12 32-14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="8" />
    </svg>
  );
}

function ReviewToneBadge({ item }: { item: ReviewHighlightItem }) {
  const toneClasses =
    item.tone === "urgent"
      ? "bg-[#ffdad6] text-[#93000a]"
      : item.tone === "today"
        ? "bg-[#ffdbca] text-[#783200]"
        : "bg-[#d8e2ff] text-[#004395]";

  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.12em]", toneClasses)}>{item.statusLabel}</span>;
}

export function StudentTodayDashboard({ viewModel }: { viewModel: TodayDashboardViewModel }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_245px]">
        <div className="space-y-3">
          <h1 className="[font-family:var(--font-display)] text-4xl font-extrabold tracking-[-0.03em] text-[#191c1e] md:text-5xl md:leading-[1.02]">
            {viewModel.hero.title}
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[#424754] md:text-lg">{viewModel.hero.description}</p>
        </div>

        <div className="rounded-[20px] bg-[#f2f4f6] p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-[0.14em] text-[#424754]">{viewModel.summary.dailyGoal.label}</p>
              <div className="flex items-center gap-3">
                <Progress value={viewModel.summary.dailyGoal.percentage} className="h-2 bg-[#e0e3e5]" />
                <span className="text-sm font-bold text-[#994100]">{viewModel.summary.dailyGoal.displayValue}</span>
              </div>
            </div>

            <div className="hidden h-10 w-px bg-[#c2c6d64d] sm:block" />

            <div className="flex items-center gap-3 sm:justify-end">
              <div className="flex size-10 items-center justify-center rounded-full bg-[#ffb6904d] text-[#994100]">
                <Trophy className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-[#424754]">{viewModel.summary.rank.label}</p>
                <p className="text-sm font-bold leading-5 text-[#191c1e]">{viewModel.summary.rank.value}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {viewModel.overdueBanner.visible ? (
        <div className="flex flex-col gap-3 rounded-[20px] border border-[#fecaca] bg-[#fff7f6] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#ffdad6] text-[#ba1a1a]">
              <Flame className="size-4" />
            </div>
            <p className="text-sm font-medium text-[#7f1d1d]">{viewModel.overdueBanner.label}</p>
          </div>
          <Button asChild variant="outline" className="rounded-[12px] border-[#f3c4bf] bg-white">
            <Link href={viewModel.overdueBanner.href}>Mở lịch học</Link>
          </Button>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,629px)_minmax(0,299px)]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-4">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-4 py-1.5 text-xs font-bold tracking-[0.16em]",
                      viewModel.learningCard.source === "overdue" ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#6cf8bb] text-[#00714d]",
                    )}
                  >
                    {viewModel.learningCard.badgeLabel}
                  </span>
                  <div className="space-y-2">
                    <h2 className="[font-family:var(--font-display)] text-5xl font-extrabold lowercase tracking-[-0.05em] text-[#0058be]">
                      {viewModel.learningCard.title}
                    </h2>
                    <p className="max-w-xl text-base leading-7 text-[#424754]">{viewModel.learningCard.supportText}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-4 md:items-end">
                  <HeroIllustration />
                  <Button asChild className="h-14 rounded-[14px] bg-[#0058be] px-6 text-base font-bold shadow-none hover:bg-[#004395]">
                    <Link href={viewModel.learningCard.ctaHref}>
                      {viewModel.learningCard.ctaLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {viewModel.learningCard.words.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {viewModel.learningCard.words.map((word) => (
                    <div key={`${word.order}-${word.word}`} className="rounded-[18px] bg-[#f2f4f6] p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex size-9 items-center justify-center rounded-[10px] bg-white text-sm font-bold text-[#0058be] shadow-sm">
                          {word.order}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-[#191c1e]">{word.word}</h3>
                          <p className="text-sm leading-6 text-[#424754]">{word.meaning}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {viewModel.quickStats.map((stat) => (
              <div key={stat.label} className="rounded-[24px] bg-[#f2f4f6] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold tracking-[0.16em] text-[#424754]">{stat.label}</p>
                    <p className="[font-family:var(--font-display)] text-4xl font-extrabold text-[#191c1e]">{stat.value}</p>
                  </div>
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-[16px]",
                      stat.tone === "success" ? "bg-[#6cf8bb] text-[#00714d]" : "bg-[#d8e2ff] text-[#004395]",
                    )}
                  >
                    {stat.tone === "success" ? <Check className="size-5" /> : <Sparkles className="size-5" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="[font-family:var(--font-display)] text-2xl font-bold text-[#191c1e]">{viewModel.reviews.title}</h2>
              <Link href={viewModel.reviews.viewAllHref} className="text-xs font-bold text-[#0058be]">
                Xem tất cả
              </Link>
            </div>

            {viewModel.reviews.items.length === 0 ? (
              <p className="mt-6 text-sm leading-6 text-[#64748b]">{viewModel.reviews.emptyMessage}</p>
            ) : (
              <div className="mt-6 space-y-4">
                {viewModel.reviews.items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-[18px] border p-4",
                      item.tone === "urgent"
                        ? "border-[#ba1a1a] bg-[#f2f4f6]"
                        : item.tone === "today"
                          ? "border-[#994100] bg-[#f2f4f6]"
                          : "border-[#0058be] bg-[#f2f4f6]",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-white text-sm font-bold lowercase text-[#0058be]">
                        {item.token}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold lowercase text-[#191c1e]">{item.root}</p>
                          <ReviewToneBadge item={item} />
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#424754]">{item.subtitle}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              asChild
              variant="secondary"
              className="mt-6 h-11 w-full rounded-[14px] bg-[#e0e3e5] text-sm font-bold text-[#424754] hover:bg-[#d7dade]"
            >
              <Link href={viewModel.reviews.clearAllHref}>
                {viewModel.reviews.clearAllLabel}
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-[32px] bg-[#0058be] p-6 text-white shadow-[var(--shadow-soft)]">
            <div className="relative z-10 space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.16em] text-white/80">{viewModel.insight.eyebrow}</p>
                <div className="space-y-3">
                  <h2 className="[font-family:var(--font-display)] max-w-[18rem] text-2xl font-bold leading-[1.35]">
                    {viewModel.insight.quote}
                  </h2>
                  <p className="text-sm text-white/80">{viewModel.insight.author}</p>
                </div>
              </div>

              <Button
                type="button"
                disabled
                className="h-10 rounded-[10px] bg-white/20 px-4 text-sm font-bold text-white opacity-100 hover:bg-white/20 disabled:pointer-events-none disabled:opacity-100"
              >
                {viewModel.insight.ctaLabel}
              </Button>
            </div>

            <div className="absolute bottom-4 right-4">
              <ScholarPenIllustration />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
