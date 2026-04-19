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

  it("marks only Today active on /today for students", () => {
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

  it("shows notifications for students and marks nested notification routes active", () => {
    mockedUsePathname.mockReturnValue("/notifications/history");

    render(<AppSidebarNav role="student" />);

    expect(screen.getByRole("link", { name: "Thông báo" })).toHaveAttribute("href", "/notifications");
    expect(screen.getByRole("link", { name: "Thông báo" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the classes item for students and marks nested class routes active", () => {
    mockedUsePathname.mockReturnValue("/classes/class-1");

    render(<AppSidebarNav role="student" />);

    expect(screen.getByRole("link", { name: "Lớp học" })).toHaveAttribute("href", "/classes");
    expect(screen.getByRole("link", { name: "Lớp học" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the exams item for students and marks nested exam routes active", () => {
    mockedUsePathname.mockReturnValue("/exams/123");

    render(<AppSidebarNav role="student" />);

    expect(screen.getByRole("link", { name: "Kỳ thi" })).toHaveAttribute("href", "/exams");
    expect(screen.getByRole("link", { name: "Kỳ thi" })).toHaveAttribute("aria-current", "page");
  });

  it("hides the roots item for students", () => {
    mockedUsePathname.mockReturnValue("/today");

    render(<AppSidebarNav role="student" />);

    expect(screen.queryByRole("link", { name: "Gốc từ" })).not.toBeInTheDocument();
  });

  it("keeps the roots item visible for teachers with teacher namespace", () => {
    mockedUsePathname.mockReturnValue("/teacher/classes");

    render(<AppSidebarNav role="teacher" />);

    expect(screen.getByRole("link", { name: "Gốc từ" })).toHaveAttribute("href", "/teacher/roots");
    expect(screen.queryByRole("link", { name: "Hôm nay" })).not.toBeInTheDocument();
  });

  it("shows teacher exams and keeps the parent item active for nested teacher exam routes", () => {
    mockedUsePathname.mockReturnValue("/teacher/exams/123");

    render(<AppSidebarNav role="teacher" />);

    expect(screen.getByRole("link", { name: "Kỳ thi" })).toHaveAttribute("href", "/teacher/exams");
    expect(screen.getByRole("link", { name: "Kỳ thi" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps the classes item active for nested teacher routes", () => {
    mockedUsePathname.mockReturnValue("/teacher/classes/123");

    render(<AppSidebarNav role="teacher" />);

    expect(screen.getByRole("link", { name: "Lớp học" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Kỳ thi" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the admin root-word item active for nested admin root-word routes", () => {
    mockedUsePathname.mockReturnValue("/admin/root-words/new");

    render(<AppSidebarNav role="admin" />);

    expect(screen.getByRole("link", { name: "Quản lý root word" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Quản lý root word" })).toHaveAttribute("href", "/admin/root-words");
  });

  it("shows the admin users item and marks it active", () => {
    mockedUsePathname.mockReturnValue("/admin/users");

    render(<AppSidebarNav role="admin" />);

    expect(screen.getByRole("link", { name: "Người dùng" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: "Người dùng" })).toHaveAttribute("aria-current", "page");
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
