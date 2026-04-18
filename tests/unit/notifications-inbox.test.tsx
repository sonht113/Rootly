import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationsInbox } from "@/features/notifications/components/notifications-inbox";
import {
  NotificationsUnreadProvider,
  useNotificationsUnreadState,
} from "@/features/notifications/components/notifications-unread-provider";
import type { NotificationListItem } from "@/features/notifications/lib/notification-presenter";
import type { NotificationRow } from "@/types/domain";

const {
  mockedPush,
  mockedRefresh,
  mockedUsePathname,
  mockedMarkNotificationReadAction,
  mockedMarkAllNotificationsReadAction,
  mockedToast,
} = vi.hoisted(() => ({
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

let notificationsUnreadState: ReturnType<typeof useNotificationsUnreadState> | null = null;

function createNotificationItem(overrides: Partial<NotificationListItem> = {}): NotificationListItem {
  return {
    id: "notification-1",
    type: "daily_root_recommendation",
    typeLabel: "Root từ hôm nay",
    title: "Có root từ đề xuất mới cho hôm nay: cred",
    message: 'Hệ thống vừa đề xuất root từ "cred" cho ngày 18/04/2026.',
    linkHref: "/today",
    isRead: false,
    createdAtLabel: "18/04 08:00",
    ...overrides,
  };
}

function createNotificationRecord(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: "notification-2",
    user_id: "user-1",
    type: "daily_root_recommendation",
    title: "Có root từ đề xuất mới cho hôm nay: memor",
    message: 'Hệ thống vừa đề xuất root từ "memor" cho ngày 18/04/2026.',
    link_href: "/today",
    metadata: {
      recommendationDate: "2026-04-18",
      rootWordId: "root-memor",
    },
    is_read: false,
    read_at: null,
    source_key: "daily_root_recommendation:2026-04-18:user-1",
    created_at: "2026-04-18T02:00:00.000Z",
    updated_at: "2026-04-18T02:00:00.000Z",
    ...overrides,
  };
}

function UnreadCountProbe() {
  const currentNotificationsUnreadState = useNotificationsUnreadState();

  useEffect(() => {
    notificationsUnreadState = currentNotificationsUnreadState;
  }, [currentNotificationsUnreadState]);

  return <div>{`Unread: ${currentNotificationsUnreadState?.unreadCount ?? 0}`}</div>;
}

describe("NotificationsInbox", () => {
  afterEach(() => {
    notificationsUnreadState = null;
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    mockedUsePathname.mockReset();
    mockedMarkNotificationReadAction.mockReset();
    mockedMarkAllNotificationsReadAction.mockReset();
    mockedToast.success.mockReset();
    mockedToast.error.mockReset();
  });

  it("decrements the shared unread count and updates local item state after marking a notification as read", async () => {
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
        <NotificationsInbox unreadCount={1} items={[createNotificationItem()]} />
      </NotificationsUnreadProvider>,
    );

    expect(screen.getByText("Unread: 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đánh dấu đã đọc" }));

    await waitFor(() => {
      expect(screen.getByText("Unread: 0")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Đánh dấu đã đọc" })).not.toBeInTheDocument();
    expect(mockedToast.success).toHaveBeenCalledWith("Đã đánh dấu thông báo đã đọc.");
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it("marks all local notifications as read without refreshing the page", async () => {
    const user = userEvent.setup();
    mockedUsePathname.mockReturnValue("/notifications");

    mockedMarkAllNotificationsReadAction.mockResolvedValue({
      success: true,
      updatedCount: 2,
      message: "Đã đánh dấu 2 thông báo là đã đọc.",
    });

    render(
      <NotificationsUnreadProvider initialUnreadCount={2}>
        <UnreadCountProbe />
        <NotificationsInbox
          unreadCount={2}
          items={[
            createNotificationItem({ id: "notification-1" }),
            createNotificationItem({
              id: "notification-2",
              title: "Giáo viên vừa gửi gợi ý mới",
              message: "Lớp 7A vừa gửi cho bạn một gợi ý từ gốc mới.",
              linkHref: "/classes/class-7a",
              createdAtLabel: "18/04 09:00",
            }),
          ]}
        />
      </NotificationsUnreadProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }));

    await waitFor(() => {
      expect(screen.getByText("Unread: 0")).toBeInTheDocument();
    });

    expect(screen.queryAllByText("Mới")).toHaveLength(0);
    expect(mockedToast.success).toHaveBeenCalledWith("Đã đánh dấu 2 thông báo là đã đọc.");
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it("syncs realtime inserts, updates, and deletes into the local inbox state", async () => {
    mockedUsePathname.mockReturnValue("/notifications");

    render(
      <NotificationsUnreadProvider initialUnreadCount={0}>
        <UnreadCountProbe />
        <NotificationsInbox
          unreadCount={0}
          items={[
            createNotificationItem({
              id: "notification-existing",
              title: "Thông báo đã xử lý",
              message: "Bạn đã xem thông báo này.",
              isRead: true,
              linkHref: null,
            }),
          ]}
        />
      </NotificationsUnreadProvider>,
    );

    await waitFor(() => {
      expect(notificationsUnreadState).not.toBeNull();
    });

    const insertedRecord = createNotificationRecord();
    const updatedRecord = createNotificationRecord({
      id: insertedRecord.id,
      title: "Có root từ đề xuất mới cho hôm nay: memorize",
      message: 'Hệ thống vừa cập nhật root từ "memorize" cho ngày 18/04/2026.',
    });

    await act(async () => {
      notificationsUnreadState?.applyInsertedNotification(insertedRecord);
    });

    await waitFor(() => {
      expect(screen.getByText("Có root từ đề xuất mới cho hôm nay: memor")).toBeInTheDocument();
      expect(screen.getByText("Unread: 1")).toBeInTheDocument();
    });

    await act(async () => {
      notificationsUnreadState?.applyUpdatedNotification(updatedRecord, insertedRecord);
    });

    expect(screen.getByText("Có root từ đề xuất mới cho hôm nay: memorize")).toBeInTheDocument();
    expect(screen.getByText('Hệ thống vừa cập nhật root từ "memorize" cho ngày 18/04/2026.')).toBeInTheDocument();

    await act(async () => {
      notificationsUnreadState?.applyDeletedNotification(updatedRecord);
    });

    await waitFor(() => {
      expect(screen.queryByText("Có root từ đề xuất mới cho hôm nay: memorize")).not.toBeInTheDocument();
      expect(screen.getByText("Unread: 0")).toBeInTheDocument();
    });

    expect(screen.getByText("Thông báo đã xử lý")).toBeInTheDocument();
    expect(mockedRefresh).not.toHaveBeenCalled();
  });
});
