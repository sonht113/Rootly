import { formatDistanceStrict, isSameDay, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

import { getProfileDisplayName } from "@/lib/utils/profile";
import type {
  BuildTodayDashboardViewModelInput,
  ReviewHighlightItem,
  TodayDashboardViewModel,
} from "@/features/today-dashboard/types";

function getGreetingPrefix(now: Date) {
  const hour = now.getHours();

  if (hour >= 5 && hour < 12) {
    return "Chào buổi sáng";
  }

  if (hour >= 12 && hour < 18) {
    return "Chào buổi chiều";
  }

  return "Chào buổi tối";
}

function extractFirstSentence(description?: string | null) {
  const normalized = description?.trim() ?? "";

  if (!normalized) {
    return "";
  }

  const match = normalized.match(/.*?[.!?](?:\s|$)/);
  return (match?.[0] ?? normalized).trim();
}

function buildRankValue(input: BuildTodayDashboardViewModelInput) {
  const currentUser = input.leaderboard.find((row) => row.is_current_user);

  if (!currentUser || input.leaderboard.length === 0) {
    return "Người mới";
  }

  const percentile = Math.max(1, Math.ceil((currentUser.rank / input.leaderboard.length) * 100));
  return `Nhóm đầu ${percentile}%`;
}

function buildReviewHighlightItems(input: BuildTodayDashboardViewModelInput, now: Date): ReviewHighlightItem[] {
  return input.reviewQueue.slice(0, 3).map((review) => {
    if (review.status === "rescheduled") {
      return {
        id: review.id,
        root: review.root_word.root,
        token: review.root_word.root,
        statusLabel: "GẤP",
        subtitle: `Bước ${review.review_step}/3 · Ôn lại sớm`,
        tone: "urgent",
      };
    }

    if (isSameDay(parseISO(review.review_date), now)) {
      return {
        id: review.id,
        root: review.root_word.root,
        token: review.root_word.root,
        statusLabel: "HÔM NAY",
        subtitle: `Bước ${review.review_step}/3 · Đến hạn hôm nay`,
        tone: "today",
      };
    }

    return {
      id: review.id,
      root: review.root_word.root,
      token: review.root_word.root,
      statusLabel: "SẮP TỚI",
      subtitle: `Bước ${review.review_step}/3 · ${formatDistanceStrict(parseISO(review.review_date), now, {
        addSuffix: true,
        locale: vi,
      })}`,
      tone: "upcoming",
    };
  });
}

function buildLearningCardSupportText(input: BuildTodayDashboardViewModelInput) {
  const featuredRoot = input.featuredRootDetail;

  if (!featuredRoot) {
    return "";
  }

  return (
    extractFirstSentence(featuredRoot.description) ||
    (input.featuredRootSource === "admin-recommended"
      ? `Admin đang đề xuất bạn khám phá root này hôm nay. Nghĩa: ${featuredRoot.meaning}`
      : `Nghĩa: ${featuredRoot.meaning}`)
  );
}

function buildLearningCardBadgeLabel(source: BuildTodayDashboardViewModelInput["featuredRootSource"]) {
  if (source === "admin-recommended") {
    return "ĐỀ XUẤT HÔM NAY";
  }

  if (source === "overdue") {
    return "ƯU TIÊN QUÁ HẠN";
  }

  return "TỪ GỐC CỦA NGÀY";
}

export function buildTodayDashboardViewModel(input: BuildTodayDashboardViewModelInput): TodayDashboardViewModel {
  const now = input.now ?? new Date();
  const displayName = getProfileDisplayName(input.dashboard.greetingName);
  const weeklyRoots = input.leaderboard.find((row) => row.is_current_user)?.metric_value ?? 0;
  const featuredRoot = input.featuredRootDetail;
  const isEmptyLearningCard = input.featuredRootSource === "empty" || !featuredRoot;

  return {
    hero: {
      title: `${getGreetingPrefix(now)}, ${displayName} 👋`,
      description: `Không gian học ngôn ngữ của bạn đã sẵn sàng. Tuần này bạn đã chinh phục ${weeklyRoots} từ gốc.`,
    },
    overdueBanner: {
      visible: input.dashboard.overduePlans.length > 0,
      count: input.dashboard.overduePlans.length,
      href: "/calendar",
      label: `${input.dashboard.overduePlans.length} mục quá hạn cần bạn xử lý.`,
    },
    summary: {
      dailyGoal: {
        ...input.dailyGoal,
        label: "MỤC TIÊU NGÀY",
        displayValue: `${input.dailyGoal.percentage}%`,
      },
      rank: {
        label: "XẾP HẠNG",
        value: buildRankValue(input),
      },
    },
    learningCard: isEmptyLearningCard
      ? {
          variant: "empty",
          badgeLabel: "SẴN SÀNG CHO TỪ GỐC MỚI",
          title: "Chưa có từ gốc trong lịch",
          supportText: "Hãy chọn một từ gốc mới trong thư viện để giữ nhịp học đều đặn.",
          ctaLabel: "Khám phá thư viện",
          ctaHref: "/library",
          source: "empty",
          words: [],
        }
      : {
          variant: "root",
          badgeLabel: buildLearningCardBadgeLabel(input.featuredRootSource),
          title: featuredRoot.root.toLowerCase(),
          supportText: buildLearningCardSupportText(input),
          ctaLabel: input.featuredRootSource === "overdue" ? "Tiếp tục học" : "Bắt đầu học",
          ctaHref: `/library/${featuredRoot.id}`,
          source: input.featuredRootSource,
          words: featuredRoot.words.slice(0, 4).map((word, index) => ({
            order: index + 1,
            word: word.word,
            meaning: word.meaning_en,
          })),
        },
    quickStats: [
      {
        label: "TỪ GỐC ĐÃ NẮM VỮNG",
        value: input.dashboard.summary.totalLearnedRoots,
        tone: "success",
      },
      {
        label: "LƯỢT ÔN TUẦN NÀY",
        value: input.dashboard.summary.totalReviewsThisWeek,
        tone: "primary",
      },
    ],
    reviews: {
      title: "Ôn tập hôm nay",
      viewAllHref: "/reviews",
      clearAllHref: "/reviews",
      clearAllLabel: "Mở danh sách ôn tập",
      emptyMessage: "Bạn đã xử lý xong các mục ôn tập hiện tại. Khi có thẻ mới đến hạn, chúng sẽ xuất hiện ở đây.",
      items: buildReviewHighlightItems(input, now),
    },
    insight: {
      eyebrow: "GÓC NHÌN NGÔN NGỮ",
      quote: "\"Giới hạn của ngôn ngữ là giới hạn của thế giới tôi.\"",
      author: "- Ludwig Wittgenstein",
      ctaLabel: "Xem thêm trích dẫn",
    },
  };
}
