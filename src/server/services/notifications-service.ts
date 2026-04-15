import { mapNotificationRowToListItem } from "@/features/notifications/lib/notification-presenter";
import {
  getCurrentUserNotifications,
  getCurrentUserUnreadNotificationCount,
  markAllCurrentUserNotificationsRead,
  markCurrentUserNotificationRead,
} from "@/server/repositories/notifications-repository";

export async function getCurrentNotificationsInbox() {
  const [notifications, unreadCount] = await Promise.all([
    getCurrentUserNotifications(),
    getCurrentUserUnreadNotificationCount(),
  ]);

  return {
    unreadCount,
    items: notifications.map(mapNotificationRowToListItem),
  };
}

export async function markNotificationAsRead(notificationId: string) {
  return markCurrentUserNotificationRead(notificationId);
}

export async function markAllNotificationsAsRead() {
  return markAllCurrentUserNotificationsRead();
}
