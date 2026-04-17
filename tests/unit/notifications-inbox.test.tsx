import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationsInbox } from "@/features/notifications/components/notifications-inbox";
import {
  NotificationsUnreadProvider,
  useNotificationsUnreadState,
} from "@/features/notifications/components/notifications-unread-provider";

const { mockedPush, mockedRefresh, mockedUsePathname, mockedMarkNotificationReadAction, mockedMarkAllNotificationsReadAction, mockedToast } =
  vi.hoisted(() => ({
    mockedPush: vi.fn(),
    mockedRefresh: vi.fn(),
    mockedUsePathname: vi.fn(),
    mockedMarkNotificationReadAction: vi.fn(),
    mockedMarkAllNotificationsReadAction: vi.fn(),
    mockedToast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockedUsePathname(),
  useRouter: () => ({
    push: mockedPush,
    refresh: mockedRefresh,
  }),
}));

vi.mock("@/features/notifications/actions/notifications", () => ({
  markNotificationReadAction: mockedMarkNotificationReadAction,
  markAllNotificationsReadAction: mockedMarkAllNotificationsReadAction,
}));

vi.mock("sonner", () => ({
  toast: mockedToast,
}));

function UnreadCountProbe() {
  const notificationsUnreadState = useNotificationsUnreadState();

  return <div>{`Unread: ${notificationsUnreadState?.unreadCount ?? 0}`}</div>;
}

describe("NotificationsInbox", () => {
  afterEach(() => {
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    mockedUsePathname.mockReset();
    mockedMarkNotificationReadAction.mockReset();
    mockedMarkAllNotificationsReadAction.mockReset();
    mockedToast.success.mockReset();
    mockedToast.error.mockReset();
  });

  it("decrements the shared unread count after marking a notification as read", async () => {
    const user = userEvent.setup();
    mockedUsePathname.mockReturnValue("/notifications");

    mockedMarkNotificationReadAction.mockResolvedValue({
      success: true,
      message: "Đã đánh dấu thông báo đã đọc.",
      linkHref: "/today",
    });

    render(
      <NotificationsUnreadProvider initialUnreadCount={1}>
        <UnreadCountProbe />
        <NotificationsInbox
          unreadCount={1}
          items={[
            {
              id: "notification-1",
              type: "daily_root_recommendation",
              typeLabel: "Root từ hôm nay",
              title: "Có root từ đề xuất mới cho hôm nay: cred",
              message: 'Hệ thống vừa đề xuất root từ "cred" cho ngày 18/04/2026.',
              linkHref: "/today",
              isRead: false,
              createdAtLabel: "18/04 08:00",
            },
          ]}
        />
      </NotificationsUnreadProvider>,
    );

    expect(screen.getByText("Unread: 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đánh dấu đã đọc" }));

    await waitFor(() => {
      expect(screen.getByText("Unread: 0")).toBeInTheDocument();
    });

    expect(mockedToast.success).toHaveBeenCalledWith("Đã đánh dấu thông báo đã đọc.");
    expect(mockedRefresh).toHaveBeenCalled();
  });
});
