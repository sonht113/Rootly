import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationsRealtimeBridge } from "@/features/notifications/components/notifications-realtime-bridge";
import { getNotificationsRealtimeTopic } from "@/features/notifications/lib/notifications-realtime";
import type { NotificationRow } from "@/types/domain";

const { mockedPush, mockedRefresh, mockedToast, mockedCreateBrowserSupabaseClient } = vi.hoisted(() => ({
  mockedPush: vi.fn(),
  mockedRefresh: vi.fn(),
  mockedToast: vi.fn(),
  mockedCreateBrowserSupabaseClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockedPush,
    refresh: mockedRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: mockedToast,
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => mockedCreateBrowserSupabaseClient(),
}));

describe("NotificationsRealtimeBridge", () => {
  const notificationRecord: NotificationRow = {
    id: "notification-1",
    user_id: "auth-user-1",
    type: "class_suggestion",
    title: "Lớp 7A vừa có gợi ý mới",
    message: 'Từ gốc "spect" được gợi ý cho ngày 15/04/2026.',
    link_href: "/today",
    metadata: {
      classId: "class-7a",
    },
    is_read: false,
    read_at: null,
    source_key: "class_suggestion:suggestion-1:auth-user-1",
    created_at: "2026-04-14T09:00:00.000Z",
    updated_at: "2026-04-14T09:00:00.000Z",
  };

  beforeEach(() => {
  });

  afterEach(() => {
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    mockedToast.mockReset();
    mockedCreateBrowserSupabaseClient.mockReset();
  });

  it("subscribes to the current user topic, shows a toast for inserts, and refreshes once", async () => {
    const handlers: Record<string, (payload: unknown) => void> = {};
    const authUnsubscribe = vi.fn();
    const channel = {
      on: vi.fn((type: string, filter: { event: string }, callback: (payload: unknown) => void) => {
        handlers[`${type}:${filter.event}`] = callback;
        return channel;
      }),
      subscribe: vi.fn(() => channel),
    };
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "access-token-1",
            },
          },
        }),
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: {
              unsubscribe: authUnsubscribe,
            },
          },
        })),
      },
      realtime: {
        setAuth: vi.fn().mockResolvedValue(undefined),
      },
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue("ok"),
    };

    mockedCreateBrowserSupabaseClient.mockReturnValue(supabase);

    const view = render(<NotificationsRealtimeBridge userId="auth-user-1" />);

    await waitFor(() => {
      expect(supabase.realtime.setAuth).toHaveBeenCalledWith("access-token-1");
      expect(supabase.channel).toHaveBeenCalledWith(getNotificationsRealtimeTopic("auth-user-1"), {
        config: { private: true },
      });
      expect(channel.subscribe).toHaveBeenCalled();
    });

    handlers["broadcast:INSERT"]({
      type: "broadcast",
      event: "INSERT",
      payload: {
        id: "broadcast-1",
        schema: "public",
        table: "notifications",
        operation: "INSERT",
        record: notificationRecord,
        old_record: null,
      },
    });

    expect(mockedToast).toHaveBeenCalledWith(
      "Lớp 7A vừa có gợi ý mới",
      expect.objectContaining({
        description: 'Từ gốc "spect" được gợi ý cho ngày 15/04/2026.',
      }),
    );
    expect(mockedRefresh).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockedRefresh).toHaveBeenCalledTimes(1);
    });

    const toastOptions = mockedToast.mock.calls[0]?.[1];
    toastOptions.action.onClick();

    expect(mockedPush).toHaveBeenCalledWith("/today");

    view.unmount();

    await waitFor(() => {
      expect(authUnsubscribe).toHaveBeenCalled();
      expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
    });
  });

  it("refreshes unread state for updates without showing a new toast", async () => {
    const handlers: Record<string, (payload: unknown) => void> = {};
    const channel = {
      on: vi.fn((type: string, filter: { event: string }, callback: (payload: unknown) => void) => {
        handlers[`${type}:${filter.event}`] = callback;
        return channel;
      }),
      subscribe: vi.fn(() => channel),
    };
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "access-token-1",
            },
          },
        }),
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        })),
      },
      realtime: {
        setAuth: vi.fn().mockResolvedValue(undefined),
      },
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue("ok"),
    };

    mockedCreateBrowserSupabaseClient.mockReturnValue(supabase);

    render(<NotificationsRealtimeBridge userId="auth-user-1" />);

    await waitFor(() => {
      expect(channel.subscribe).toHaveBeenCalled();
    });

    handlers["broadcast:UPDATE"]({
      type: "broadcast",
      event: "UPDATE",
      payload: {
        id: "broadcast-2",
        schema: "public",
        table: "notifications",
        operation: "UPDATE",
        record: {
          ...notificationRecord,
          is_read: true,
          read_at: "2026-04-14T09:05:00.000Z",
        },
        old_record: notificationRecord,
      },
    });

    expect(mockedToast).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockedRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
