import type { NotificationRow } from "@/types/domain";

export type NotificationRealtimeRecord = NotificationRow;

export function getNotificationsRealtimeTopic(userId: string) {
  return `user:${userId}:notifications`;
}
