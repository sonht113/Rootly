"use client";

import { createContext, useContext, useRef, useState } from "react";

import type {
  NotificationRealtimeEvent,
  NotificationRealtimeRecord,
} from "@/features/notifications/lib/notifications-realtime";

export type NotificationRealtimeEventListener = (event: NotificationRealtimeEvent) => void;

interface NotificationsUnreadContextValue {
  unreadCount: number;
  incrementUnreadCount: (amount?: number) => void;
  decrementUnreadCount: (amount?: number) => void;
  resetUnreadCount: (count: number) => void;
  optimisticallyMarkNotificationRead: (notificationId: string) => void;
  optimisticallyMarkAllNotificationsRead: (count: number) => void;
  applyInsertedNotification: (record: NotificationRealtimeRecord) => void;
  applyUpdatedNotification: (record: NotificationRealtimeRecord, previousRecord: NotificationRealtimeRecord) => void;
  applyDeletedNotification: (record: NotificationRealtimeRecord) => void;
  subscribeToRealtimeEvents: (listener: NotificationRealtimeEventListener) => () => void;
}

const NotificationsUnreadContext = createContext<NotificationsUnreadContextValue | null>(null);

interface NotificationsUnreadProviderProps {
  initialUnreadCount: number;
  children: React.ReactNode;
}

function clampUnreadCount(count: number) {
  return count < 0 ? 0 : count;
}

export function NotificationsUnreadProvider({
  initialUnreadCount,
  children,
}: NotificationsUnreadProviderProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const optimisticReadIdsRef = useRef(new Set<string>());
  const optimisticMarkAllCountRef = useRef(0);
  const realtimeListenersRef = useRef(new Set<NotificationRealtimeEventListener>());

  function emitRealtimeEvent(event: NotificationRealtimeEvent) {
    for (const listener of realtimeListenersRef.current) {
      listener(event);
    }
  }

  function incrementUnreadCount(amount = 1) {
    setUnreadCount((currentCount) => currentCount + Math.max(0, amount));
  }

  function decrementUnreadCount(amount = 1) {
    setUnreadCount((currentCount) => clampUnreadCount(currentCount - Math.max(0, amount)));
  }

  function resetUnreadCount(count: number) {
    setUnreadCount(clampUnreadCount(count));
  }

  function optimisticallyMarkNotificationRead(notificationId: string) {
    if (optimisticReadIdsRef.current.has(notificationId)) {
      return;
    }

    optimisticReadIdsRef.current.add(notificationId);
    decrementUnreadCount();
  }

  function optimisticallyMarkAllNotificationsRead(count: number) {
    const normalizedCount = Math.max(0, count);

    if (normalizedCount === 0) {
      return;
    }

    optimisticMarkAllCountRef.current += normalizedCount;
    decrementUnreadCount(normalizedCount);
  }

  function applyInsertedNotification(record: NotificationRealtimeRecord) {
    if (!record.is_read) {
      incrementUnreadCount();
    }

    emitRealtimeEvent({
      type: "INSERT",
      record,
    });
  }

  function applyUpdatedNotification(
    record: NotificationRealtimeRecord,
    previousRecord: NotificationRealtimeRecord,
  ) {
    if (record.is_read !== previousRecord.is_read) {
      if (record.is_read) {
        if (optimisticReadIdsRef.current.delete(record.id)) {
          emitRealtimeEvent({
            type: "UPDATE",
            record,
            previousRecord,
          });
          return;
        }

        if (optimisticMarkAllCountRef.current > 0) {
          optimisticMarkAllCountRef.current -= 1;
          emitRealtimeEvent({
            type: "UPDATE",
            record,
            previousRecord,
          });
          return;
        }

        decrementUnreadCount();
      } else {
        incrementUnreadCount();
      }
    }

    emitRealtimeEvent({
      type: "UPDATE",
      record,
      previousRecord,
    });
  }

  function applyDeletedNotification(record: NotificationRealtimeRecord) {
    if (!record.is_read) {
      if (optimisticReadIdsRef.current.delete(record.id)) {
        emitRealtimeEvent({
          type: "DELETE",
          record,
        });
        return;
      }

      if (optimisticMarkAllCountRef.current > 0) {
        optimisticMarkAllCountRef.current -= 1;
        emitRealtimeEvent({
          type: "DELETE",
          record,
        });
        return;
      }

      decrementUnreadCount();
    }

    emitRealtimeEvent({
      type: "DELETE",
      record,
    });
  }

  function subscribeToRealtimeEvents(listener: NotificationRealtimeEventListener) {
    realtimeListenersRef.current.add(listener);

    return () => {
      realtimeListenersRef.current.delete(listener);
    };
  }

  return (
    <NotificationsUnreadContext.Provider
      value={{
        unreadCount,
        incrementUnreadCount,
        decrementUnreadCount,
        resetUnreadCount,
        optimisticallyMarkNotificationRead,
        optimisticallyMarkAllNotificationsRead,
        applyInsertedNotification,
        applyUpdatedNotification,
        applyDeletedNotification,
        subscribeToRealtimeEvents,
      }}
    >
      {children}
    </NotificationsUnreadContext.Provider>
  );
}

export function useNotificationsUnreadState() {
  return useContext(NotificationsUnreadContext);
}
