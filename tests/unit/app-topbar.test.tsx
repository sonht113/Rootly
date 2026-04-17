import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppTopbar } from "@/components/layouts/app-topbar";
import { NotificationsUnreadProvider } from "@/features/notifications/components/notifications-unread-provider";
import type { ProfileRow } from "@/types/domain";

const mockedUsePathname = vi.fn<() => string | null>();
const mockedUseSearchParams = vi.fn<() => URLSearchParams>();
const mockedPush = vi.fn();
const mockedRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockedUsePathname(),
  useRouter: () => ({
    push: mockedPush,
    refresh: mockedRefresh,
  }),
  useSearchParams: () => mockedUseSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const profile: ProfileRow = {
  id: "profile-1",
  auth_user_id: "auth-1",
  username: "student.son_nguyen",
  full_name: "Nguyễn Văn Sơn",
  email: "son@example.com",
  avatar_url: "https://example.com/avatar.png",
  role: "student",
  created_at: "2026-04-11T00:00:00.000Z",
  updated_at: "2026-04-11T00:00:00.000Z",
};

const teacherProfile: ProfileRow = {
  ...profile,
  id: "profile-2",
  auth_user_id: "auth-2",
  username: "teacher.minh",
  full_name: "Phạm Minh",
  role: "teacher",
};

describe("AppTopbar", () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue("/library");
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("q=latin"));
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    mockedUsePathname.mockReset();
    mockedUseSearchParams.mockReset();
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    vi.restoreAllMocks();
  });

  it("renders the figma header content with search-aligned nav menu and streak data", () => {
    render(<AppTopbar profile={profile} streak={7} unreadNotificationCount={2} />);

    const searchInput = screen.getByRole("searchbox");
    const searchForm = searchInput.closest("form");
    const navMenuButton = screen.getByRole("button", { name: "Mở menu điều hướng" });

    expect(searchInput).toHaveValue("latin");
    expect(searchForm).not.toBeNull();
    expect(searchForm).toContainElement(navMenuButton);
    expect(navMenuButton).toHaveClass("lg:hidden");
    expect(navMenuButton.compareDocumentPosition(searchInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Chuỗi 7 ngày")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn Sơn")).toBeInTheDocument();
    expect(screen.getByText("NS")).toBeInTheDocument();
  });

  it("renders the notifications link with unread badge state", () => {
    render(<AppTopbar profile={profile} streak={7} unreadNotificationCount={120} />);

    const notificationsLink = screen.getByRole("link", { name: "Mở thông báo, 120 chưa đọc" });

    expect(notificationsLink).toHaveAttribute("href", "/notifications");
    expect(notificationsLink).toHaveAttribute("title", "120 thông báo chưa đọc");
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("prefers the shared unread count when rendered inside the notifications provider", () => {
    render(
      <NotificationsUnreadProvider initialUnreadCount={5}>
        <AppTopbar profile={profile} streak={7} unreadNotificationCount={0} />
      </NotificationsUnreadProvider>,
    );

    const notificationsLink = screen.getByRole("link", { name: "Mở thông báo, 5 chưa đọc" });

    expect(notificationsLink).toHaveAttribute("title", "5 thông báo chưa đọc");
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("logs out from the profile dropdown", async () => {
    const user = userEvent.setup();
    render(<AppTopbar profile={profile} streak={7} unreadNotificationCount={0} />);

    await user.click(screen.getByRole("button", { name: "Mở menu hồ sơ" }));
    await user.click(screen.getByRole("menuitem", { name: "Đăng xuất" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(mockedPush).toHaveBeenCalledWith("/login");
      expect(mockedRefresh).toHaveBeenCalled();
    });
  });

  it("opens the profile page from the profile dropdown", async () => {
    const user = userEvent.setup();
    render(<AppTopbar profile={profile} streak={7} unreadNotificationCount={0} />);

    await user.click(screen.getByRole("button", { name: "Mở menu hồ sơ" }));
    await user.click(screen.getByRole("menuitem", { name: "Hồ sơ" }));

    expect(mockedPush).toHaveBeenCalledWith("/profile");
  });
  it("uses role-aware notification and profile routes for teachers", async () => {
    const user = userEvent.setup();
    mockedUsePathname.mockReturnValue("/teacher/classes");
    mockedUseSearchParams.mockReturnValue(new URLSearchParams());

    render(<AppTopbar profile={teacherProfile} streak={12} unreadNotificationCount={1} />);

    expect(screen.getByRole("link", { name: "Mở thông báo, 1 chưa đọc" })).toHaveAttribute("href", "/teacher/notifications");

    await user.click(screen.getByRole("button", { name: "Mở menu hồ sơ" }));
    await user.click(screen.getByRole("menuitem", { name: "Hồ sơ" }));

    expect(mockedPush).toHaveBeenCalledWith("/teacher/profile");
  });
});
