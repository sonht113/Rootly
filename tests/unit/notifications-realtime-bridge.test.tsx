import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationsRealtimeBridge } from "@/features/notifications/components/notifications-realtime-bridge";
import {
  NotificationsUnreadProvider,
  useNotificationsUnreadState,
} from "@/features/notifications/components/notifications-unread-provider";
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

function UnreadCountProbe() {
  const notificationsUnreadState = useNotificationsUnreadState();

  return <div>{`Unread: ${notificationsUnreadState?.unreadCount ?? 0}`}</div>;
}

function createSupabaseMock() {
  const handlers: Record<string, (payload: unknown) => void> = {};
  const authUnsubscribe = vi.fn();
  let subscribeCallback: ((status: "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED", error?: Error) => void) | null =
    null;
  const channel = {
    on: vi.fn((type: string, filter: { event: string }, callback: (payload: unknown) => void) => {
      handlers[`${type}:${filter.event}`] = callback;
      return channel;
    }),
    subscribe: vi.fn((callback?: (status: "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED", error?: Error) => void) => {
      subscribeCallback = callback ?? null;
      return channel;
    }),
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

  return {
    handlers,
    authUnsubscribe,
    channel,
    emitSubscribeStatus: (status: "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED", error?: Error) => {
      subscribeCallback?.(status, error);
    },
    supabase,
  };
}

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

  afterEach(() => {
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    mockedToast.mockReset();
    mockedCreateBrowserSupabaseClient.mockReset();
    vi.unstubAllGlobals();
  });

  it("ignores CLOSED from an intentionally removed stale channel during reconnect", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ unreadCount: 2 }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const authStateHandlers: Array<(event: string, session: { access_token?: string } | null) => void> = [];
    const handlers: Record<string, (payload: unknown) => void> = {};
    const subscribeCallbacks: Array<
      ((status: "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED", error?: Error) => void) | null
    > = [];
    const channels: Array<{
      on: ReturnType<typeof vi.fn>;
      subscribe: ReturnType<typeof vi.fn>;
    }> = [];
    const authUnsubscribe = vi.fn();
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "access-token-1",
            },
          },
        }),
        onAuthStateChange: vi.fn((callback: (event: string, session: { access_token?: string } | null) => void) => {
          authStateHandlers.push(callback);
          return {
            data: {
              subscription: {
                unsubscribe: authUnsubscribe,
              },
            },
          };
        }),
      },
      realtime: {
        setAuth: vi.fn().mockResolvedValue(undefined),
      },
      channel: vi.fn(() => {
        const channelIndex = channels.length;
        const nextChannel = {
          on: vi.fn((type: string, filter: { event: string }, callback: (payload: unknown) => void) => {
            handlers[`${channelIndex}:${type}:${filter.event}`] = callback;
            return nextChannel;
          }),
          subscribe: vi.fn(
            (callback?: (status: "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED", error?: Error) => void) => {
              subscribeCallbacks[channelIndex] = callback ?? null;
              return nextChannel;
            },
          ),
        };
        channels.push(nextChannel);
        return nextChannel;
      }),
      removeChannel: vi.fn().mockResolvedValue("ok"),
    };

    mockedCreateBrowserSupabaseClient.mockReturnValue(supabase);

    render(
      <NotificationsUnreadProvider initialUnreadCount={0}>
        <UnreadCountProbe />
        <NotificationsRealtimeBridge userId="auth-user-1" />
      </NotificationsUnreadProvider>,
    );

    await waitFor(() => {
      expect(channels).toHaveLength(1);
      expect(channels[0]?.subscribe).toHaveBeenCalled();
    });

    await act(async () => {
      authStateHandlers[0]?.("TOKEN_REFRESHED", { access_token: "access-token-2" });
    });

    await waitFor(() => {
      expect(supabase.removeChannel).toHaveBeenCalledWith(channels[0]);
      expect(channels.length).toBeGreaterThanOrEqual(2);
    });
    const channelCountBeforeClosed = channels.length;

    await act(async () => {
      subscribeCallbacks[0]?.("CLOSED");
    });

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      "Notifications realtime channel is unavailable",
      expect.objectContaining({
        status: "CLOSED",
      }),
    );
    expect(channels).toHaveLength(channelCountBeforeClosed);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("subscribes to the current user topic and shows a toast for inserts without refreshing the shell", async () => {
    const { handlers, authUnsubscribe, channel, supabase } = createSupabaseMock();

    const view = render(<NotificationsRealtimeBridge userId="auth-user-1" />);

    await waitFor(() => {
      expect(supabase.realtime.setAuth).toHaveBeenCalledWith("access-token-1");
      expect(supabase.channel).toHaveBeenCalledWith(getNotificationsRealtimeTopic("auth-user-1"), {
        config: { private: true },
      });
      expect(channel.subscribe).toHaveBeenCalled();
    });

    await act(async () => {
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
    });

    expect(mockedToast).toHaveBeenCalledWith(
      "Lớp 7A vừa có gợi ý mới",
      expect.objectContaining({
        description: 'Từ gốc "spect" được gợi ý cho ngày 15/04/2026.',
      }),
    );
    expect(mockedRefresh).not.toHaveBeenCalled();

    const toastOptions = mockedToast.mock.calls[0]?.[1];
    toastOptions.action.onClick();

    expect(mockedPush).toHaveBeenCalledWith("/today");

    view.unmount();

    await waitFor(() => {
      expect(authUnsubscribe).toHaveBeenCalled();
      expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
    });
  });

  it("increments shared unread count when a new unread notification arrives", async () => {
    const { handlers, channel } = createSupabaseMock();

    render(
      <NotificationsUnreadProvider initialUnreadCount={0}>
        <UnreadCountProbe />
        <NotificationsRealtimeBridge userId="auth-user-1" />
      </NotificationsUnreadProvider>,
    );

    await waitFor(() => {
      expect(channel.subscribe).toHaveBeenCalled();
    });

    await act(async () => {
      handlers["broadcast:INSERT"]({
        type: "broadcast",
        event: "INSERT",
        payload: {
          id: "broadcast-4",
          schema: "public",
          table: "notifications",
          operation: "INSERT",
          record: notificationRecord,
          old_record: null,
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Unread: 1")).toBeInTheDocument();
    });
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it("deduplicates duplicate insert toasts for the same notification event", async () => {
    const { handlers, channel } = createSupabaseMock();

    render(<NotificationsRealtimeBridge userId="auth-user-1" />);

    await waitFor(() => {
      expect(channel.subscribe).toHaveBeenCalled();
    });

    await act(async () => {
      handlers["broadcast:INSERT"]({
        type: "broadcast",
        event: "INSERT",
        payload: {
          id: "broadcast-duplicate-1",
          schema: "public",
          table: "notifications",
          operation: "INSERT",
          record: notificationRecord,
          old_record: null,
        },
      });
      handlers["broadcast:INSERT"]({
        type: "broadcast",
        event: "INSERT",
        payload: {
          id: "broadcast-duplicate-2",
          schema: "public",
          table: "notifications",
          operation: "INSERT",
          record: notificationRecord,
          old_record: null,
        },
      });
    });

    expect(mockedToast).toHaveBeenCalledTimes(1);
  });

  it("updates unread state for read updates without showing a new toast or refreshing", async () => {
    const { handlers, channel } = createSupabaseMock();

    render(
      <NotificationsUnreadProvider initialUnreadCount={1}>
        <UnreadCountProbe />
        <NotificationsRealtimeBridge userId="auth-user-1" />
      </NotificationsUnreadProvider>,
    );

    await waitFor(() => {
      expect(channel.subscribe).toHaveBeenCalled();
    });

    await act(async () => {
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
    });

    expect(mockedToast).not.toHaveBeenCalled();
    expect(mockedRefresh).not.toHaveBeenCalled();
    expect(screen.getByText("Unread: 0")).toBeInTheDocument();
  });

  it("shows a toast for updated unread notifications when the content changes without refreshing", async () => {
    const { handlers, channel } = createSupabaseMock();

    render(<NotificationsRealtimeBridge userId="auth-user-1" />);

    await waitFor(() => {
      expect(channel.subscribe).toHaveBeenCalled();
    });

    await act(async () => {
      handlers["broadcast:UPDATE"]({
        type: "broadcast",
        event: "UPDATE",
        payload: {
          id: "broadcast-3",
          schema: "public",
          table: "notifications",
          operation: "UPDATE",
          record: {
            ...notificationRecord,
            type: "daily_root_recommendation",
            title: "Có root từ đề xuất mới cho hôm nay: cred",
            message: 'Hệ thống vừa đề xuất root từ "cred" cho ngày 18/04/2026.',
            source_key: "daily_root_recommendation:2026-04-18:auth-user-1",
          },
          old_record: {
            ...notificationRecord,
            type: "daily_root_recommendation",
            title: "Có root từ đề xuất mới cho hôm nay: dict",
            message: 'Hệ thống vừa đề xuất root từ "dict" cho ngày 18/04/2026.',
            source_key: "daily_root_recommendation:2026-04-18:auth-user-1",
          },
        },
      });
    });

    expect(mockedToast).toHaveBeenCalledWith(
      "Có root từ đề xuất mới cho hôm nay: cred",
      expect.objectContaining({
        description: 'Hệ thống vừa đề xuất root từ "cred" cho ngày 18/04/2026.',
      }),
    );
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it("decrements shared unread count when an unread notification is deleted without refreshing", async () => {
    const { handlers, channel } = createSupabaseMock();

    render(
      <NotificationsUnreadProvider initialUnreadCount={1}>
        <UnreadCountProbe />
        <NotificationsRealtimeBridge userId="auth-user-1" />
      </NotificationsUnreadProvider>,
    );

    await waitFor(() => {
      expect(channel.subscribe).toHaveBeenCalled();
    });

    await act(async () => {
      handlers["broadcast:DELETE"]({
        type: "broadcast",
        event: "DELETE",
        payload: {
          id: "broadcast-5",
          schema: "public",
          table: "notifications",
          operation: "DELETE",
          record: null,
          old_record: notificationRecord,
        },
      });
    });

    expect(screen.getByText("Unread: 0")).toBeInTheDocument();
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it("falls back to refreshing unread count when the realtime channel errors", async () => {
    const { channel, emitSubscribeStatus } = createSupabaseMock();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ unreadCount: 4 }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ),
    );

    render(
      <NotificationsUnreadProvider initialUnreadCount={0}>
        <UnreadCountProbe />
        <NotificationsRealtimeBridge userId="auth-user-1" />
      </NotificationsUnreadProvider>,
    );

    await waitFor(() => {
      expect(channel.subscribe).toHaveBeenCalled();
    });

    await act(async () => {
      emitSubscribeStatus("CHANNEL_ERROR", new Error("realtime unavailable"));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notifications/unread-count", {
        method: "GET",
        cache: "no-store",
      });
      expect(screen.getByText("Unread: 4")).toBeInTheDocument();
    });
  });

  it("does not reconnect when auth state changes but the access token stays the same", async () => {
    const authStateHandlers: Array<(event: string, session: { access_token?: string } | null) => void> = [];
    const channel = {
      on: vi.fn((_: string, __: { event: string }, ___: (payload: unknown) => void) => channel),
      subscribe: vi.fn(() => channel),
    };
    const authUnsubscribe = vi.fn();
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "access-token-1",
            },
          },
        }),
        onAuthStateChange: vi.fn((callback: (event: string, session: { access_token?: string } | null) => void) => {
          authStateHandlers.push(callback);
          return {
            data: {
              subscription: {
                unsubscribe: authUnsubscribe,
              },
            },
          };
        }),
      },
      realtime: {
        setAuth: vi.fn().mockResolvedValue(undefined),
      },
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue("ok"),
    };

    mockedCreateBrowserSupabaseClient.mockReturnValue(supabase);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ unreadCount: 0 }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ),
    );

    render(<NotificationsRealtimeBridge userId="auth-user-1" />);

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      authStateHandlers[0]?.("TOKEN_REFRESHED", { access_token: "access-token-1" });
    });

    expect(supabase.channel).toHaveBeenCalledTimes(1);
    expect(supabase.removeChannel).not.toHaveBeenCalled();
  });
});
