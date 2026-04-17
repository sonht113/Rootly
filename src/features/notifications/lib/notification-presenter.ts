import type { NotificationRow, NotificationType } from "@/types/domain";

export interface NotificationListItem {
  id: string;
  type: NotificationType;
  typeLabel: string;
  title: string;
  message: string;
  linkHref: string | null;
  isRead: boolean;
  createdAtLabel: string;
}

const notificationTypeLabels: Record<NotificationType, string> = {
  class_member_added: "Tham gia lớp học",
  class_suggestion: "Gợi ý từ lớp",
  daily_root_recommendation: "Root từ hôm nay",
};

const notificationDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function formatNotificationDate(value: string) {
  return notificationDateFormatter.format(new Date(value));
}

export function mapNotificationRowToListItem(notification: NotificationRow): NotificationListItem {
  return {
    id: notification.id,
    type: notification.type,
    typeLabel: notificationTypeLabels[notification.type],
    title: notification.title,
    message: notification.message,
    linkHref: notification.link_href,
    isRead: notification.is_read,
    createdAtLabel: formatNotificationDate(notification.created_at),
  };
}
