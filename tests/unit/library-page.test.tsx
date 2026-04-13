import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedGetPaginatedLibraryRootWords, mockedGetUser } = vi.hoisted(() => ({
  mockedGetPaginatedLibraryRootWords: vi.fn(),
  mockedGetUser: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockedGetUser,
    },
  })),
}));

vi.mock("@/server/repositories/root-words-repository", () => ({
  getPaginatedLibraryRootWords: mockedGetPaginatedLibraryRootWords,
}));

vi.mock("@/features/root-words/components/library-root-card", () => ({
  LibraryRootCard: ({ rootWord }: { rootWord: { root: string } }) => <div>{`card-${rootWord.root}`}</div>,
}));

vi.mock("@/features/root-words/components/library-spotlight-card", () => ({
  LibrarySpotlightCard: ({ rootWord }: { rootWord: { root: string } }) => <div>{`spotlight-${rootWord.root}`}</div>,
}));

import LibraryPage from "@/app/(student)/library/page";

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

describe("LibraryPage", () => {
  beforeEach(() => {
    mockedGetPaginatedLibraryRootWords.mockReset();
    mockedGetUser.mockReset();
    mockedGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
  });

  it("requests server-side pagination and preserves query params in page links", async () => {
    mockedGetPaginatedLibraryRootWords.mockResolvedValue({
      items: Array.from({ length: 10 }, (_, index) => createRootWord(index + 1)),
      totalCount: 25,
      totalPages: 3,
      currentPage: 2,
      pageSize: 10,
    });

    render(
      await LibraryPage({
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
      userId: "user-1",
      page: 2,
      pageSize: 10,
    });
    expect(screen.getByText("Hiển thị 11-20 trên 25 root word")).toBeInTheDocument();
    expect(screen.getByText("Trang 2/3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Trước/i })).toHaveAttribute("href", "/library?q=bio&level=basic");
    expect(screen.getByRole("link", { name: /Sau/i })).toHaveAttribute("href", "/library?q=bio&level=basic&page=3");
  });
});
