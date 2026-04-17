"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import type { NotificationRealtimeRecord } from "@/features/notifications/lib/notifications-realtime";

interface NotificationsUnreadContextValue {
  unreadCount: number;
  incrementUnreadCount: (amount?: number) => void;
  decrementUnreadCount: (amount?: number) => void;
  resetUnreadCount: (count: number) => void;
  optimisticallyMarkNotificationRead: (notificationId: string) => void;
  optimisticallyMarkAllNotificationsRead: (count: number) => void;
  applyInsertedNotification: (record: NotificationRealtimeRecord) => void;
  applyUpdatedNotification: (record: NotificationRealtimeRecord, previousRecord: NotificationRealtimeRecord) => void;
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

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

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
  }

  function applyUpdatedNotification(
    record: NotificationRealtimeRecord,
    previousRecord: NotificationRealtimeRecord,
  ) {
    if (record.is_read === previousRecord.is_read) {
      return;
    }

    if (record.is_read) {
      if (optimisticReadIdsRef.current.delete(record.id)) {
        return;
      }

      if (optimisticMarkAllCountRef.current > 0) {
        optimisticMarkAllCountRef.current -= 1;
        return;
      }

      decrementUnreadCount();
      return;
    }

    incrementUnreadCount();
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
      }}
    >
      {children}
    </NotificationsUnreadContext.Provider>
  );
}

export function useNotificationsUnreadState() {
  return useContext(NotificationsUnreadContext);
}
