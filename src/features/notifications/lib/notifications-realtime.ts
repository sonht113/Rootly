import type { NotificationRow } from "@/types/domain";

export type NotificationRealtimeRecord = NotificationRow;

export type NotificationRealtimeEvent =
  | {
      type: "INSERT";
      record: NotificationRealtimeRecord;
    }
  | {
      type: "UPDATE";
      record: NotificationRealtimeRecord;
      previousRecord: NotificationRealtimeRecord;
    }
  | {
      type: "DELETE";
      record: NotificationRealtimeRecord;
    };

export function getNotificationsRealtimeTopic(userId: string) {
  return `user:${userId}:notifications`;
}
