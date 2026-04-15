"use client";

import type { RealtimeChannel } from "@supabase/realtime-js";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState, type MutableRefObject } from "react";
import { toast } from "sonner";

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
  const refreshTimeoutRef = useRef<number | null>(null);

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
      const record = payload.record;
      const href = record.link_href ?? "/notifications";

      toast(record.title, {
        description: record.message,
        action: {
          label: "Mở",
          onClick: () => router.push(href),
        },
      });

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
        .on("broadcast", { event: "UPDATE" }, () => {
          handleNotificationRefresh();
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
