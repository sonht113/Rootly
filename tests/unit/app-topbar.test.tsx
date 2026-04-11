import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppTopbar } from "@/components/layouts/app-topbar";
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
  email: "son@example.com",
  avatar_url: "https://example.com/avatar.png",
  role: "student",
  created_at: "2026-04-11T00:00:00.000Z",
  updated_at: "2026-04-11T00:00:00.000Z",
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

  it("renders the figma header content with live search and streak data", () => {
    render(<AppTopbar profile={profile} streak={7} />);

    expect(screen.getByDisplayValue("latin")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tìm từ nguyên, từ gốc hoặc từ vựng...")).toBeInTheDocument();
    expect(screen.getByText("Chuỗi 7 ngày")).toBeInTheDocument();
    expect(screen.getByText("Son Nguyen")).toBeInTheDocument();
    expect(screen.getByText("Học viên")).toBeInTheDocument();
    expect(screen.getByText("SN")).toBeInTheDocument();
  });

  it("logs out from the profile dropdown", async () => {
    const user = userEvent.setup();
    render(<AppTopbar profile={profile} streak={7} />);

    await user.click(screen.getByRole("button", { name: "Mở menu hồ sơ" }));
    await user.click(screen.getByRole("menuitem", { name: "Đăng xuất" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(mockedPush).toHaveBeenCalledWith("/login");
      expect(mockedRefresh).toHaveBeenCalled();
    });
  });
});
