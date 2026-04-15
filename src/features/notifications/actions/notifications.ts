"use server";

import { revalidatePath } from "next/cache";

import { markNotificationReadSchema } from "@/lib/validations/notifications";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/server/services/notifications-service";

function revalidateNotificationShell() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(input: unknown) {
  const parsed = markNotificationReadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Thông báo không hợp lệ.",
      linkHref: null,
    };
  }

  try {
    const result = await markNotificationAsRead(parsed.data.notificationId);
    revalidateNotificationShell();

    return {
      success: true,
      message: result.changed ? "Đã đánh dấu thông báo đã đọc." : "Thông báo này đã được đánh dấu trước đó.",
      linkHref: result.linkHref ?? null,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể cập nhật trạng thái thông báo.",
      linkHref: null,
    };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const result = await markAllNotificationsAsRead();
    revalidateNotificationShell();

    return {
      success: true,
      updatedCount: result.updatedCount,
      message:
        result.updatedCount > 0
          ? `Đã đánh dấu ${result.updatedCount} thông báo là đã đọc.`
          : "Không còn thông báo chưa đọc.",
    };
  } catch (error) {
    return {
      success: false,
      updatedCount: 0,
      message: error instanceof Error ? error.message : "Không thể cập nhật trạng thái thông báo.",
    };
  }
}
