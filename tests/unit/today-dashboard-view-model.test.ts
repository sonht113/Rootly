import { describe, expect, it } from "vitest";

import { buildTodayDashboardViewModel } from "@/features/today-dashboard/lib/build-today-dashboard-view-model";
import type { BuildTodayDashboardViewModelInput } from "@/features/today-dashboard/types";

function createInput(overrides: Partial<BuildTodayDashboardViewModelInput> = {}): BuildTodayDashboardViewModelInput {
  return {
    dashboard: {
      greetingName: "student.son_nguyen",
      streak: 7,
      todayPlans: [
        {
          id: "plan-1",
          user_id: "user-1",
          root_word_id: "root-1",
          scheduled_date: "2026-04-11",
          status: "planned",
          source: "manual",
          completed_at: null,
          created_at: "",
          updated_at: "",
          root_word: {
            id: "root-1",
            root: "spect",
            meaning: "to look",
            level: "basic",
            word_count: 8,
          },
        },
      ],
      todayReviews: [],
      overduePlans: [
        {
          id: "overdue-1",
          user_id: "user-1",
          root_word_id: "root-2",
          scheduled_date: "2026-04-10",
          status: "overdue",
          source: "manual",
          completed_at: null,
          created_at: "",
          updated_at: "",
          root_word: {
            id: "root-2",
            root: "dict",
            meaning: "to say",
          },
        },
      ],
      summary: {
        totalLearnedRoots: 142,
        totalReviewsThisWeek: 38,
        totalWordsLearned: 512,
      },
    },
    dailyGoal: {
      total: 4,
      completed: 3,
      percentage: 75,
    },
    leaderboard: [
      {
        rank: 2,
        user_id: "user-1",
        username: "student.son_nguyen",
        avatar_url: null,
        role: "student",
        metric_value: 12,
        root_words_learned: 12,
        words_learned: 50,
        reviews_completed: 20,
        streak: 7,
        is_current_user: true,
      },
      {
        rank: 1,
        user_id: "user-2",
        username: "student.an",
        avatar_url: null,
        role: "student",
        metric_value: 14,
        root_words_learned: 14,
        words_learned: 60,
        reviews_completed: 25,
        streak: 10,
        is_current_user: false,
      },
      {
        rank: 3,
        user_id: "user-3",
        username: "student.binh",
        avatar_url: null,
        role: "student",
        metric_value: 10,
        root_words_learned: 10,
        words_learned: 40,
        reviews_completed: 18,
        streak: 5,
        is_current_user: false,
      },
    ],
    reviewQueue: [
      {
        id: "review-1",
        review_date: "2026-04-11",
        review_step: 2,
        status: "pending",
        root_word: {
          root: "bio",
        },
      },
      {
        id: "review-2",
        review_date: "2026-04-11",
        review_step: 1,
        status: "rescheduled",
        root_word: {
          root: "dict",
        },
      },
      {
        id: "review-3",
        review_date: "2026-04-12",
        review_step: 3,
        status: "pending",
        root_word: {
          root: "phil",
        },
      },
    ],
    featuredRootDetail: {
      id: "root-1",
      root: "spect",
      meaning: "to look",
      description: "To look at something closely. Often used for close observation.",
      level: "basic",
      tags: [],
      is_published: true,
      created_by: null,
      created_at: "",
      updated_at: "",
      words: [
        {
          id: "word-1",
          root_word_id: "root-1",
          word: "inspect",
          part_of_speech: "verb",
          pronunciation: null,
          meaning_en: "To look at something closely.",
          meaning_vi: "",
          created_at: "",
          updated_at: "",
          example_sentences: [],
        },
      ],
    },
    featuredRootSource: "today",
    now: new Date("2026-04-11T12:00:00"),
    ...overrides,
  };
}

describe("buildTodayDashboardViewModel", () => {
  it("prefers the today plan root when one exists", () => {
    const viewModel = buildTodayDashboardViewModel(createInput());

    expect(viewModel.learningCard.source).toBe("today");
    expect(viewModel.learningCard.badgeLabel).toBe("TỪ GỐC CỦA NGÀY");
    expect(viewModel.learningCard.ctaHref).toBe("/library/root-1");
  });

  it("uses an overdue root fallback when no today plan exists", () => {
    const base = createInput();
    const viewModel = buildTodayDashboardViewModel(
      createInput({
        dashboard: {
          ...base.dashboard,
          todayPlans: [],
        },
        featuredRootSource: "overdue",
        featuredRootDetail: {
          ...base.featuredRootDetail!,
          id: "root-2",
          root: "dict",
        },
      }),
    );

    expect(viewModel.learningCard.source).toBe("overdue");
    expect(viewModel.learningCard.badgeLabel).toBe("ƯU TIÊN QUÁ HẠN");
    expect(viewModel.learningCard.ctaLabel).toBe("Tiếp tục học");
  });

  it("returns the empty learning card when no featured root exists", () => {
    const base = createInput();
    const viewModel = buildTodayDashboardViewModel(
      createInput({
        dashboard: {
          ...base.dashboard,
          todayPlans: [],
          overduePlans: [],
        },
        featuredRootSource: "empty",
        featuredRootDetail: null,
      }),
    );

    expect(viewModel.learningCard.variant).toBe("empty");
    expect(viewModel.learningCard.title).toBe("Chưa có từ gốc trong lịch");
    expect(viewModel.learningCard.ctaHref).toBe("/library");
  });

  it("calculates the visible rank percentile from leaderboard position", () => {
    const viewModel = buildTodayDashboardViewModel(createInput());

    expect(viewModel.summary.rank.value).toBe("Nhóm đầu 67%");
  });

  it("maps review items to urgent, today, and upcoming tones", () => {
    const viewModel = buildTodayDashboardViewModel(createInput());

    expect(viewModel.reviews.items[0]).toMatchObject({
      statusLabel: "HÔM NAY",
      subtitle: "Bước 2/3 · Đến hạn hôm nay",
    });
    expect(viewModel.reviews.items[1]).toMatchObject({
      statusLabel: "GẤP",
      subtitle: "Bước 1/3 · Ôn lại sớm",
    });
    expect(viewModel.reviews.items[2].statusLabel).toBe("SẮP TỚI");
  });

  it("shows the overdue banner only when overdue items exist", () => {
    const base = createInput();
    const withOverdue = buildTodayDashboardViewModel(base);
    const withoutOverdue = buildTodayDashboardViewModel(
      createInput({
        dashboard: {
          ...base.dashboard,
          overduePlans: [],
        },
      }),
    );

    expect(withOverdue.overdueBanner.visible).toBe(true);
    expect(withOverdue.overdueBanner.label).toBe("1 mục quá hạn cần bạn xử lý.");
    expect(withoutOverdue.overdueBanner.visible).toBe(false);
  });
});
