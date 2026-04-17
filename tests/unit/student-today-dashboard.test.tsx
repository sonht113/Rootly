import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StudentTodayDashboard } from "@/features/today-dashboard/components/student-today-dashboard";
import type { TodayDashboardViewModel } from "@/features/today-dashboard/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const viewModel: TodayDashboardViewModel = {
  hero: {
    title: "Chào buổi tối, Son Nguyen 👋",
    description: "Không gian học ngôn ngữ của bạn đã sẵn sàng. Tuần này bạn đã chinh phục 12 từ gốc.",
  },
  overdueBanner: {
    visible: true,
    count: 1,
    href: "/calendar",
    label: "1 mục quá hạn cần bạn xử lý.",
  },
  summary: {
    dailyGoal: {
      total: 4,
      completed: 3,
      percentage: 75,
      label: "MỤC TIÊU NGÀY",
      displayValue: "75%",
    },
    rank: {
      label: "XẾP HẠNG",
      value: "Nhóm đầu 5%",
    },
  },
  learningCard: {
    variant: "root",
    badgeLabel: "ĐỀ XUẤT HÔM NAY",
    title: "spect",
    supportText: "Nghĩa: nhìn kỹ.",
    ctaLabel: "Bắt đầu học",
    ctaHref: "/library/root-1",
    source: "admin-recommended",
    words: [
      {
        order: 1,
        word: "inspect",
        meaning: "Nhìn kỹ, kiểm tra kỹ.",
      },
    ],
  },
  quickStats: [
    {
      label: "TỪ GỐC ĐÃ NẮM VỮNG",
      value: 142,
      tone: "success",
    },
    {
      label: "LƯỢT ÔN TUẦN NÀY",
      value: 38,
      tone: "primary",
    },
  ],
  reviews: {
    title: "Ôn tập hôm nay",
    viewAllHref: "/reviews",
    clearAllHref: "/reviews",
    clearAllLabel: "Mở danh sách ôn tập",
    emptyMessage: "Bạn đã xử lý xong các mục ôn tập hiện tại. Khi có thẻ mới đến hạn, chúng sẽ xuất hiện ở đây.",
    items: [
      {
        id: "review-1",
        root: "bio",
        token: "bio",
        statusLabel: "HÔM NAY",
        subtitle: "Bước 2/3 · Đến hạn hôm nay",
        tone: "today",
      },
    ],
  },
  insight: {
    eyebrow: "GÓC NHÌN NGÔN NGỮ",
    quote: "\"Giới hạn của ngôn ngữ là giới hạn của thế giới tôi.\"",
    author: "- Ludwig Wittgenstein",
    ctaLabel: "Xem thêm trích dẫn",
  },
};

describe("StudentTodayDashboard", () => {
  it("renders the redesigned dashboard content", () => {
    render(<StudentTodayDashboard viewModel={viewModel} />);

    expect(screen.getByRole("heading", { name: "Chào buổi tối, Son Nguyen 👋" })).toBeInTheDocument();
    expect(screen.getByText("MỤC TIÊU NGÀY")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("ĐỀ XUẤT HÔM NAY")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Bắt đầu học/i })).toHaveAttribute("href", "/library/root-1");
    expect(screen.getByRole("link", { name: "Xem tất cả" })).toHaveAttribute("href", "/reviews");
    expect(screen.getByRole("link", { name: /Mở danh sách ôn tập/i })).toHaveAttribute("href", "/reviews");
    expect(screen.getByText("\"Giới hạn của ngôn ngữ là giới hạn của thế giới tôi.\"")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xem thêm trích dẫn" })).toBeDisabled();
  });

  it("renders the overdue banner link to calendar", () => {
    render(<StudentTodayDashboard viewModel={viewModel} />);

    expect(screen.getByText("1 mục quá hạn cần bạn xử lý.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở lịch học" })).toHaveAttribute("href", "/calendar");
  });
});
