import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LibraryRootCard } from "@/features/root-words/components/library-root-card";
import type { LibraryRootWord } from "@/server/repositories/root-words-repository";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function createRootWord(overrides: Partial<LibraryRootWord> = {}): LibraryRootWord {
  return {
    id: "root-1",
    root: "spect",
    meaning: "look",
    description: "Latin: to look",
    level: "basic",
    tags: ["vision", "observe", "inspect"],
    is_published: true,
    created_by: null,
    created_at: "2026-04-10T00:00:00.000Z",
    updated_at: "2026-04-10T00:00:00.000Z",
    wordCount: 12,
    previewWords: ["inspect", "spectator", "perspective"],
    moreWordsCount: 9,
    originLabel: 'Nghĩa: "look"',
    masteryProgress: 72,
    learningStatus: null,
    ctaLabel: "Học ngay",
    ctaHref: "/library/root-1",
    ...overrides,
  };
}

describe("LibraryRootCard", () => {
  it("uses the CTA from the library root word payload and keeps the button text white", () => {
    render(
      <LibraryRootCard
        rootWord={createRootWord({
          learningStatus: "remembered",
          ctaLabel: "Ôn tập lại",
          ctaHref: "/library/root-1?reviewId=review-9",
        })}
      />,
    );

    expect(screen.getByText("Đã nhớ")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Ôn tập lại" });
    expect(link).toHaveAttribute("href", "/library/root-1?reviewId=review-9");
    expect(link).toHaveClass("text-white");
  });

  it("allows roots page to override the CTA label and destination", () => {
    render(
      <LibraryRootCard
        rootWord={createRootWord()}
        hrefBase="/roots"
        ctaLabel="Mở hồ sơ"
      />,
    );

    expect(screen.getByRole("link", { name: "Mở hồ sơ" })).toHaveAttribute("href", "/roots/root-1");
  });
});
