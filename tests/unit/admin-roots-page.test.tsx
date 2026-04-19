import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedGetCurrentProfile, mockedGetPaginatedLibraryRootWords } = vi.hoisted(() => ({
  mockedGetCurrentProfile: vi.fn(),
  mockedGetPaginatedLibraryRootWords: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: mockedGetCurrentProfile,
}));

vi.mock("@/server/repositories/root-words-repository", () => ({
  getPaginatedLibraryRootWords: mockedGetPaginatedLibraryRootWords,
}));

vi.mock("@/features/root-words/components/library-root-card", () => ({
  LibraryRootCard: ({
    rootWord,
    ctaLabel,
    hrefBase,
  }: {
    rootWord: { root: string };
    ctaLabel?: string;
    hrefBase?: string;
  }) => <div>{`${rootWord.root}|${ctaLabel}|${hrefBase}`}</div>,
}));

import AdminRootsPage from "@/app/(admin)/admin/roots/page";

function createRootWord(index: number) {
  return {
    id: `root-${index}`,
    root: `root-${index}`,
    meaning: `meaning-${index}`,
    description: `description-${index}`,
    level: "basic",
    tags: [],
    is_published: true,
    created_by: null,
    created_at: "2026-04-10T00:00:00.000Z",
    updated_at: "2026-04-10T00:00:00.000Z",
    wordCount: 10 + index,
    previewWords: [`word-${index}`],
    moreWordsCount: 0,
    originLabel: `Origin ${index}`,
    masteryProgress: 40 + index,
    learningStatus: null,
    ctaLabel: "Học ngay",
    ctaHref: `/library/root-${index}`,
  };
}

describe("AdminRootsPage", () => {
  beforeEach(() => {
    mockedGetCurrentProfile.mockReset();
    mockedGetPaginatedLibraryRootWords.mockReset();

    mockedGetCurrentProfile.mockResolvedValue({
      auth_user_id: "admin-1",
      role: "admin",
    });
  });

  it("uses server-side pagination and renders admin card CTAs as 'Xem chi tiết'", async () => {
    mockedGetPaginatedLibraryRootWords.mockResolvedValue({
      items: Array.from({ length: 10 }, (_, index) => createRootWord(index + 1)),
      totalCount: 24,
      totalPages: 3,
      currentPage: 2,
      pageSize: 10,
    });

    render(
      await AdminRootsPage({
        searchParams: Promise.resolve({
          q: "bio",
          level: "basic",
          page: "2",
        }),
      }),
    );

    expect(mockedGetPaginatedLibraryRootWords).toHaveBeenCalledWith({
      query: "bio",
      level: "basic",
      userId: "admin-1",
      page: 2,
      pageSize: 10,
    });
    expect(screen.getByText("root-1|Xem chi tiết|/admin/roots")).toBeInTheDocument();
    expect(screen.getByText("Hiển thị 11-20 trên 24 root word")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Trước/i })).toHaveAttribute("href", "/admin/roots?q=bio&level=basic");
    expect(screen.getByRole("link", { name: /Sau/i })).toHaveAttribute("href", "/admin/roots?q=bio&level=basic&page=3");
    expect(screen.getByRole("link", { name: /Quản lý root word/i })).toHaveAttribute("href", "/admin/root-words");
  });
});
