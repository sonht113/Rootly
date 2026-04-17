"use client";

import type { RealtimeChannel } from "@supabase/realtime-js";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState, type MutableRefObject } from "react";
import { toast } from "sonner";

import { useNotificationsUnreadState } from "@/features/notifications/components/notifications-unread-provider";
import { getNotificationsRealtimeTopic, type NotificationRealtimeRecord } from "@/features/notifications/lib/notifications-realtime";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface NotificationsRealtimeBridgeProps {
  userId: string;
}

const REFRESH_DEBOUNCE_MS = 250;

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

function scheduleRefresh(
  refreshTimeoutRef: MutableRefObject<number | null>,
  refresh: () => void,
) {
  if (refreshTimeoutRef.current) {
    window.clearTimeout(refreshTimeoutRef.current);
  }

  refreshTimeoutRef.current = window.setTimeout(() => {
    refreshTimeoutRef.current = null;
    refresh();
  }, REFRESH_DEBOUNCE_MS);
}

export function NotificationsRealtimeBridge({ userId }: NotificationsRealtimeBridgeProps) {
  const router = useRouter();
  const [supabase] = useState(createBrowserSupabaseClient);
  const notificationsUnreadState = useNotificationsUnreadState();
  const applyInsertedNotificationRef = useRef(notificationsUnreadState?.applyInsertedNotification);
  const applyUpdatedNotificationRef = useRef(notificationsUnreadState?.applyUpdatedNotification);
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    applyInsertedNotificationRef.current = notificationsUnreadState?.applyInsertedNotification;
    applyUpdatedNotificationRef.current = notificationsUnreadState?.applyUpdatedNotification;
  }, [notificationsUnreadState]);

  useEffect(() => {
    let isActive = true;
    let channel: RealtimeChannel | null = null;

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void supabase.realtime.setAuth(session?.access_token ?? null);
    });

    const refreshShell = () => {
      startTransition(() => {
        router.refresh();
      });
    };

    function handleNotificationInsert(payload: NotificationInsertBroadcastPayload) {
      applyInsertedNotificationRef.current?.(payload.record);
      showNotificationToast(payload.record, (href) => router.push(href));

      scheduleRefresh(refreshTimeoutRef, refreshShell);
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

      if (shouldToastForUpdate(payload)) {
        showNotificationToast(payload.record, (href) => router.push(href));
      }

      scheduleRefresh(refreshTimeoutRef, refreshShell);
    }

    function handleNotificationRefresh() {
      scheduleRefresh(refreshTimeoutRef, refreshShell);
    }

    async function setupRealtime() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await supabase.realtime.setAuth(session?.access_token ?? null);

      if (!isActive) {
        return;
      }

      channel = supabase
        .channel(getNotificationsRealtimeTopic(userId), {
          config: { private: true },
        })
        .on("broadcast", { event: "INSERT" }, ({ payload }: { payload: NotificationInsertBroadcastPayload }) => {
          handleNotificationInsert(payload);
        })
        .on("broadcast", { event: "UPDATE" }, ({ payload }: { payload: NotificationUpdateBroadcastPayload }) => {
          handleNotificationUpdate(payload);
        })
        .on("broadcast", { event: "DELETE" }, () => {
          handleNotificationRefresh();
        })
        .subscribe();
    }

    void setupRealtime();

    return () => {
      isActive = false;
      authSubscription.unsubscribe();

      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router, supabase, userId]);

  return null;
}
