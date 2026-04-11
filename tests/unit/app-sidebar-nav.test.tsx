import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppSidebarNav } from "@/components/layouts/app-sidebar-nav";

const mockedUsePathname = vi.fn<() => string | null>();

vi.mock("next/navigation", () => ({
  usePathname: () => mockedUsePathname(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AppSidebarNav", () => {
  afterEach(() => {
    mockedUsePathname.mockReset();
  });

  it("marks only Today active on /today", () => {
    mockedUsePathname.mockReturnValue("/today");

    render(<AppSidebarNav role="student" />);

    expect(screen.getByRole("link", { name: "Hôm nay" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Thư viện" })).not.toHaveAttribute("aria-current");
  });

  it("marks Library active on /library", () => {
    mockedUsePathname.mockReturnValue("/library");

    render(<AppSidebarNav role="student" />);

    expect(screen.getByRole("link", { name: "Thư viện" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Hôm nay" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the parent item active for nested teacher routes", () => {
    mockedUsePathname.mockReturnValue("/teacher/classes/123");

    render(<AppSidebarNav role="teacher" />);

    expect(screen.getByRole("link", { name: "Lớp học" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Hôm nay" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the parent item active for nested admin routes", () => {
    mockedUsePathname.mockReturnValue("/admin/root-words/new");

    render(<AppSidebarNav role="admin" />);

    expect(screen.getByRole("link", { name: "Nội dung" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Hôm nay" })).not.toHaveAttribute("aria-current");
  });

  it("updates the active item when the pathname changes", () => {
    mockedUsePathname.mockReturnValue("/today");

    const { rerender } = render(<AppSidebarNav role="student" />);

    expect(screen.getByRole("link", { name: "Hôm nay" })).toHaveAttribute("aria-current", "page");

    mockedUsePathname.mockReturnValue("/progress");
    rerender(<AppSidebarNav role="student" />);

    expect(screen.getByRole("link", { name: "Tiến độ" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Hôm nay" })).not.toHaveAttribute("aria-current");
  });
});
