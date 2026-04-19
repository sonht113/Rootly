import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedGetPaginatedAdminRootWords, mockedGetTodayDailyRootRecommendation } = vi.hoisted(() => ({
  mockedGetPaginatedAdminRootWords: vi.fn(),
  mockedGetTodayDailyRootRecommendation: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/admin-content/components/import-panel", () => ({
  ImportPanel: () => <div>mock-import-panel</div>,
}));

vi.mock("@/features/admin-content/actions/root-words", () => ({
  deleteRootWordAction: vi.fn(),
  setTodayRecommendedRootWordAction: vi.fn(),
}));

vi.mock("@/server/repositories/root-words-repository", () => ({
  getPaginatedAdminRootWords: mockedGetPaginatedAdminRootWords,
}));

vi.mock("@/server/repositories/daily-root-recommendations-repository", () => ({
  getTodayDailyRootRecommendation: mockedGetTodayDailyRootRecommendation,
}));

import AdminRootWordsPage from "@/app/(admin)/admin/root-words/page";

describe("AdminRootWordsPage", () => {
  beforeEach(() => {
    mockedGetPaginatedAdminRootWords.mockReset();
    mockedGetTodayDailyRootRecommendation.mockReset();
  });

  it("renders the paginated admin management table and preserves filters in page links", async () => {
    mockedGetPaginatedAdminRootWords.mockResolvedValue({
      items: [
        {
          id: "root-1",
          root: "spect",
          meaning: "nhìn; xem",
          description: "Nhóm từ liên quan đến việc nhìn.",
          level: "basic",
          tags: ["daily-use", "academic"],
          is_published: true,
          created_by: null,
          created_at: "2026-04-10T00:00:00.000Z",
          updated_at: "2026-04-18T08:30:00.000Z",
          words: [{ count: 12 }],
        },
      ],
      totalCount: 24,
      totalPages: 3,
      currentPage: 2,
      pageSize: 10,
    });
    mockedGetTodayDailyRootRecommendation.mockResolvedValue({
      rootWordId: "root-1",
      rootWord: {
        id: "root-1",
        root: "spect",
        meaning: "nhìn; xem",
      },
    });

    render(
      await AdminRootWordsPage({
        searchParams: Promise.resolve({ q: "spect", published: "published", page: "2" }),
      }),
    );

    expect(mockedGetPaginatedAdminRootWords).toHaveBeenCalledWith({
      query: "spect",
      published: "published",
      page: 2,
      pageSize: 10,
    });
    expect(screen.getByText("mock-import-panel")).toBeInTheDocument();
    expect(screen.getByText("Bảng quản lý root word")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem chi tiết" })).toHaveAttribute("href", "/admin/roots/root-1");
    expect(screen.getByRole("link", { name: /Chỉnh sửa/i })).toHaveAttribute("href", "/admin/root-words/new?edit=root-1");
    expect(screen.getAllByText("Đề xuất hôm nay")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Trước/i })).toHaveAttribute("href", "/admin/root-words?q=spect&published=published");
    expect(screen.getByRole("link", { name: /Sau/i })).toHaveAttribute("href", "/admin/root-words?q=spect&published=published&page=3");
    expect(screen.getByText("Trang 2/3")).toBeInTheDocument();
  });
});
