import { describe, expect, it } from "vitest";

import { formatNotificationDate, mapNotificationRowToListItem } from "@/features/notifications/lib/notification-presenter";
import type { NotificationRow } from "@/types/domain";

describe("notification-presenter", () => {
  it("maps notification rows into inbox list items", () => {
    const notification: NotificationRow = {
      id: "notification-1",
      user_id: "user-1",
      type: "class_suggestion",
      title: "Giáo viên vừa gợi ý từ mới",
      message: "Lớp 7A vừa gửi cho bạn một gợi ý từ gốc mới.",
      link_href: "/teacher/classes/class-7a",
      metadata: {
        suggestion_id: "suggestion-1",
        class_id: "class-7a",
      },
      is_read: false,
      read_at: null,
      source_key: "class-suggestion:suggestion-1",
      created_at: "2026-04-14T08:15:00.000Z",
      updated_at: "2026-04-14T08:15:00.000Z",
    };

    expect(mapNotificationRowToListItem(notification)).toEqual({
      id: "notification-1",
      type: "class_suggestion",
      typeLabel: "Gợi ý từ lớp",
      title: "Giáo viên vừa gợi ý từ mới",
      message: "Lớp 7A vừa gửi cho bạn một gợi ý từ gốc mới.",
      linkHref: "/teacher/classes/class-7a",
      isRead: false,
      createdAtLabel: formatNotificationDate("2026-04-14T08:15:00.000Z"),
    });
  });

  it("maps class-member-added notifications into inbox list items", () => {
    const notification: NotificationRow = {
      id: "notification-2",
      user_id: "user-1",
      type: "class_member_added",
      title: "Bạn vừa được thêm vào lớp 7A",
      message: 'Giáo viên đã thêm bạn vào lớp "Lớp 7A".',
      link_href: "/notifications",
      metadata: {
        classId: "class-7a",
        className: "Lớp 7A",
      },
      is_read: false,
      read_at: null,
      source_key: "class_member_added:member-1",
      created_at: "2026-04-15T03:00:00.000Z",
      updated_at: "2026-04-15T03:00:00.000Z",
    };

    expect(mapNotificationRowToListItem(notification)).toEqual({
      id: "notification-2",
      type: "class_member_added",
      typeLabel: "Tham gia lớp học",
      title: "Bạn vừa được thêm vào lớp 7A",
      message: 'Giáo viên đã thêm bạn vào lớp "Lớp 7A".',
      linkHref: "/notifications",
      isRead: false,
      createdAtLabel: formatNotificationDate("2026-04-15T03:00:00.000Z"),
    });
  });

  it("formats notification dates in Ho Chi Minh timezone", () => {
    const formatted = formatNotificationDate("2026-04-14T08:15:00.000Z");

    expect(formatted).toContain("15:15");
    expect(formatted).toContain("14");
    expect(formatted).toContain("04");
  });
});
