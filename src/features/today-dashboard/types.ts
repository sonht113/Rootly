import type { RankingRow, RootWordDetail, TodayDashboardData, UserRootReviewStatus } from "@/types/domain";

export interface DailyGoalSummary {
  total: number;
  completed: number;
  percentage: number;
}

export interface ReviewHighlightItem {
  id: string;
  root: string;
  token: string;
  statusLabel: string;
  subtitle: string;
  tone: "urgent" | "today" | "upcoming";
}

export interface TodayDashboardViewModel {
  hero: {
    title: string;
    description: string;
  };
  overdueBanner: {
    visible: boolean;
    count: number;
    href: string;
    label: string;
  };
  summary: {
    dailyGoal: DailyGoalSummary & {
      label: string;
      displayValue: string;
    };
    rank: {
      label: string;
      value: string;
    };
  };
  learningCard: {
    variant: "root" | "empty";
    badgeLabel: string;
    title: string;
    supportText: string;
    ctaLabel: string;
    ctaHref: string;
    source: "today" | "overdue" | "empty";
    words: Array<{
      order: number;
      word: string;
      meaning: string;
    }>;
  };
  quickStats: Array<{
    label: string;
    value: number;
    tone: "success" | "primary";
  }>;
  reviews: {
    title: string;
    viewAllHref: string;
    clearAllHref: string;
    clearAllLabel: string;
    emptyMessage: string;
    items: ReviewHighlightItem[];
  };
  insight: {
    eyebrow: string;
    quote: string;
    author: string;
    ctaLabel: string;
  };
}

export interface BuildTodayDashboardViewModelInput {
  dashboard: TodayDashboardData;
  dailyGoal: DailyGoalSummary;
  leaderboard: RankingRow[];
  reviewQueue: Array<{
    id: string;
    review_date: string;
    review_step: number;
    status: UserRootReviewStatus;
    root_word: {
      root: string;
    };
  }>;
  featuredRootDetail: RootWordDetail | null;
  featuredRootSource: "today" | "overdue" | "empty";
  now?: Date;
}
