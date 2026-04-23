"use client";

import type { RealtimeChannel } from "@supabase/realtime-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useNotificationsUnreadState } from "@/features/notifications/components/notifications-unread-provider";
import { getNotificationsRealtimeTopic, type NotificationRealtimeRecord } from "@/features/notifications/lib/notifications-realtime";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface NotificationsRealtimeBridgeProps {
  userId: string;
}

type RealtimeSubscribeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED";

type NotificationInsertBroadcastPayload = {
  id: string;
  schema: string;
  table: string;
  operation: "INSERT";
  record: NotificationRealtimeRecord;
  old_record: null;
};

type NotificationUpdateBroadcastPayload = {
  id: string;
  schema: string;
  table: string;
  operation: "UPDATE";
  record: NotificationRealtimeRecord;
  old_record: NotificationRealtimeRecord;
};

type NotificationDeleteBroadcastPayload = {
  id: string;
  schema: string;
  table: string;
  operation: "DELETE";
  record: null;
  old_record: NotificationRealtimeRecord;
};

function showNotificationToast(record: NotificationRealtimeRecord, onOpen: (href: string) => void) {
  const href = record.link_href ?? "/notifications";

  toast(record.title, {
    description: record.message,
    action: {
      label: "Mở",
      onClick: () => onOpen(href),
    },
  });
}

export function NotificationsRealtimeBridge({ userId }: NotificationsRealtimeBridgeProps) {
  const router = useRouter();
  const [supabase] = useState(createBrowserSupabaseClient);
  const notificationsUnreadState = useNotificationsUnreadState();
  const applyInsertedNotificationRef = useRef(notificationsUnreadState?.applyInsertedNotification);
  const applyUpdatedNotificationRef = useRef(notificationsUnreadState?.applyUpdatedNotification);
  const applyDeletedNotificationRef = useRef(notificationsUnreadState?.applyDeletedNotification);
  const resetUnreadCountRef = useRef(notificationsUnreadState?.resetUnreadCount);
  const latestSessionTokenRef = useRef<string | null>(null);
  const shownToastKeysRef = useRef(new Map<string, number>());

  useEffect(() => {
    applyInsertedNotificationRef.current = notificationsUnreadState?.applyInsertedNotification;
    applyUpdatedNotificationRef.current = notificationsUnreadState?.applyUpdatedNotification;
    applyDeletedNotificationRef.current = notificationsUnreadState?.applyDeletedNotification;
    resetUnreadCountRef.current = notificationsUnreadState?.resetUnreadCount;
  }, [notificationsUnreadState]);

  useEffect(() => {
    let isActive = true;
    let channel: RealtimeChannel | null = null;
    let retryTimeoutId: number | null = null;
    let activeGeneration = 0;
    let intentionalCloseGeneration: number | null = null;
    let isReconnecting = false;
    let setupGeneration = 0;

    function buildToastKey(operation: "INSERT" | "UPDATE", record: NotificationRealtimeRecord) {
      return `${operation}:${record.id}:${record.updated_at}`;
    }

    function shouldShowToast(operation: "INSERT" | "UPDATE", record: NotificationRealtimeRecord) {
      const now = Date.now();
      const ttlMs = 15_000;

      for (const [toastKey, createdAt] of shownToastKeysRef.current.entries()) {
        if (now - createdAt > ttlMs) {
          shownToastKeysRef.current.delete(toastKey);
        }
      }

      const nextToastKey = buildToastKey(operation, record);
      if (shownToastKeysRef.current.has(nextToastKey)) {
        return false;
      }

      shownToastKeysRef.current.set(nextToastKey, now);
      return true;
    }

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void supabase.realtime.setAuth(session?.access_token ?? null);
      void refreshUnreadCount();

      const nextSessionToken = session?.access_token ?? null;
      if (nextSessionToken === latestSessionTokenRef.current) {
        return;
      }

      latestSessionTokenRef.current = nextSessionToken;
      void reconnectRealtime();
    });

    function clearRetryTimeout() {
      if (retryTimeoutId) {
        window.clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }
    }

    async function refreshUnreadCount() {
      if (!isActive) {
        return;
      }

      try {
        const response = await fetch("/api/notifications/unread-count", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to refresh unread notifications count: ${response.status}`);
        }

        const result = (await response.json()) as { unreadCount?: number };

        if (typeof result.unreadCount === "number") {
          resetUnreadCountRef.current?.(result.unreadCount);
        }
      } catch (error) {
        console.error("Failed to refresh unread notifications count", error);
      }
    }

    function scheduleReconnect() {
      if (!isActive || retryTimeoutId || isReconnecting) {
        return;
      }

      retryTimeoutId = window.setTimeout(() => {
        retryTimeoutId = null;
        void reconnectRealtime();
      }, 5000);
    }

    function handleNotificationInsert(payload: NotificationInsertBroadcastPayload) {
      applyInsertedNotificationRef.current?.(payload.record);

      if (shouldShowToast("INSERT", payload.record)) {
        showNotificationToast(payload.record, (href) => router.push(href));
      }
    }

    function shouldToastForUpdate(payload: NotificationUpdateBroadcastPayload) {
      const nextRecord = payload.record;
      const previousRecord = payload.old_record;

      if (nextRecord.is_read) {
        return false;
      }

      return (
        previousRecord.is_read !== nextRecord.is_read ||
        previousRecord.title !== nextRecord.title ||
        previousRecord.message !== nextRecord.message ||
        previousRecord.link_href !== nextRecord.link_href
      );
    }

    function handleNotificationUpdate(payload: NotificationUpdateBroadcastPayload) {
      applyUpdatedNotificationRef.current?.(payload.record, payload.old_record);

      if (shouldToastForUpdate(payload) && shouldShowToast("UPDATE", payload.record)) {
        showNotificationToast(payload.record, (href) => router.push(href));
      }
    }

    function handleNotificationDelete(payload: NotificationDeleteBroadcastPayload) {
      applyDeletedNotificationRef.current?.(payload.old_record);
    }

    async function teardownRealtimeChannel() {
      clearRetryTimeout();

      if (channel) {
        const currentChannel = channel;
        intentionalCloseGeneration = activeGeneration;
        channel = null;
        await supabase.removeChannel(currentChannel);
      }
    }

    async function setupRealtime() {
      const generation = ++setupGeneration;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      latestSessionTokenRef.current = session?.access_token ?? null;
      await supabase.realtime.setAuth(session?.access_token ?? null);

      if (!isActive || generation !== setupGeneration) {
        return;
      }

      activeGeneration += 1;
      const channelGeneration = activeGeneration;
      intentionalCloseGeneration = null;

      const nextChannel = supabase
        .channel(getNotificationsRealtimeTopic(userId), {
          config: { private: true },
        })
        .on("broadcast", { event: "INSERT" }, ({ payload }: { payload: NotificationInsertBroadcastPayload }) => {
          handleNotificationInsert(payload);
        })
        .on("broadcast", { event: "UPDATE" }, ({ payload }: { payload: NotificationUpdateBroadcastPayload }) => {
          handleNotificationUpdate(payload);
        })
        .on("broadcast", { event: "DELETE" }, ({ payload }: { payload: NotificationDeleteBroadcastPayload }) => {
          handleNotificationDelete(payload);
        })
        .subscribe((status: RealtimeSubscribeStatus, error?: Error) => {
          const isStaleGeneration = channelGeneration !== activeGeneration;
          const isIntentionalClose = status === "CLOSED" && intentionalCloseGeneration === channelGeneration;

          if (!isActive || isStaleGeneration || isIntentionalClose) {
            return;
          }

          if (status === "SUBSCRIBED") {
            clearRetryTimeout();
            isReconnecting = false;
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            isReconnecting = false;
            console.error("Notifications realtime channel is unavailable", {
              userId,
              topic: getNotificationsRealtimeTopic(userId),
              status,
              error,
            });
            void refreshUnreadCount();
            scheduleReconnect();
          }
        });

      if (!isActive || generation !== setupGeneration) {
        intentionalCloseGeneration = channelGeneration;
        await supabase.removeChannel(nextChannel);
        return;
      }

      channel = nextChannel;
    }

    async function reconnectRealtime() {
      if (!isActive || isReconnecting) {
        return;
      }

      isReconnecting = true;

      await teardownRealtimeChannel();

      if (!isActive) {
        isReconnecting = false;
        return;
      }

      await setupRealtime();
    }

    void setupRealtime();

    return () => {
      isActive = false;
      intentionalCloseGeneration = activeGeneration;
      clearRetryTimeout();
      authSubscription.unsubscribe();

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router, supabase, userId]);

  return null;
}
