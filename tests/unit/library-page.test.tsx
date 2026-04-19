import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedGetPaginatedLibraryRootWords, mockedGetCurrentProfile } = vi.hoisted(() => ({
  mockedGetPaginatedLibraryRootWords: vi.fn(),
  mockedGetCurrentProfile: vi.fn(),
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
    ctaLabel: "Hoc ngay",
    ctaHref: `/library/root-${index}`,
  };
}

function createNamedRootWord(root: string, wordCount: number) {
  return {
    ...createRootWord(wordCount),
    id: root,
    root,
    wordCount,
    previewWords: [`${root}-word`],
    originLabel: `Origin ${root}`,
    ctaHref: `/library/${root}`,
  };
}

describe("LibraryPage", () => {
  beforeEach(() => {
    mockedGetPaginatedLibraryRootWords.mockReset();
    mockedGetCurrentProfile.mockReset();
    mockedGetCurrentProfile.mockResolvedValue({
      auth_user_id: "user-1",
      role: "student",
    });
  });

  it("requests server-side pagination for library searches and preserves query params in page links", async () => {
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
          q: "respect",
          level: "basic",
          page: "2",
        }),
      }),
    );

    expect(mockedGetPaginatedLibraryRootWords).toHaveBeenCalledWith({
      query: "respect",
      level: "basic",
      userId: "user-1",
      page: 2,
      pageSize: 10,
    });
    expect(screen.getByText("Trang 2/3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trước" })).toHaveAttribute("href", "/library?q=respect&level=basic");
    expect(screen.getByRole("link", { name: "Sau" })).toHaveAttribute("href", "/library?q=respect&level=basic&page=3");
  });
  it("keeps search results in the card list instead of moving the top match into spotlight", async () => {
    mockedGetPaginatedLibraryRootWords.mockResolvedValue({
      items: [
        createNamedRootWord("able", 5),
        createNamedRootWord("bio", 1),
        createNamedRootWord("port", 1),
      ],
      totalCount: 3,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
    });

    render(
      await LibraryPage({
        searchParams: Promise.resolve({
          q: "able",
        }),
      }),
    );

    expect(screen.getByText("card-able")).toBeInTheDocument();
    expect(screen.getByText("card-bio")).toBeInTheDocument();
    expect(screen.getByText("card-port")).toBeInTheDocument();
    expect(screen.queryByText("spotlight-able")).not.toBeInTheDocument();
  });
});
