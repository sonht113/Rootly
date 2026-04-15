import { getCurrentSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/types/domain";

import { unwrapSupabaseError } from "@/server/repositories/shared";

async function requireCurrentUserId() {
  const user = await getCurrentSession();

  if (!user) {
    throw new Error("Bạn cần đăng nhập để truy cập thông báo.");
  }

  return user.id;
}

export async function getCurrentUserNotifications(limit = 50) {
  const userId = await requireCurrentUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, message, link_href, metadata, is_read, read_at, source_key, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách thông báo");
  }

  return (data ?? []) as NotificationRow[];
}

export async function getCurrentUserUnreadNotificationCount() {
  const user = await getCurrentSession();

  if (!user) {
    return 0;
  }

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    unwrapSupabaseError(error, "Không thể tải số thông báo chưa đọc");
  }

  return count ?? 0;
}

export async function markCurrentUserNotificationRead(notificationId: string) {
  const userId = await requireCurrentUserId();
  const supabase = await createServerSupabaseClient();
  const { data: existingNotification, error: notificationError } = await supabase
    .from("notifications")
    .select("id, link_href, is_read")
    .eq("id", notificationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (notificationError) {
    unwrapSupabaseError(notificationError, "Không thể tải thông báo này");
  }

  if (!existingNotification) {
    throw new Error("Không tìm thấy thông báo cần cập nhật.");
  }

  if (existingNotification.is_read) {
    return {
      id: existingNotification.id,
      linkHref: existingNotification.link_href,
      changed: false,
    };
  }

  const { data: updatedNotification, error: updateError } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id, link_href")
    .single();

  if (updateError || !updatedNotification) {
    unwrapSupabaseError(updateError, "Không thể đánh dấu thông báo đã đọc");
  }

  if (!updatedNotification) {
    throw new Error("Không thể tải lại thông báo vừa cập nhật.");
  }

  return {
    id: updatedNotification.id,
    linkHref: updatedNotification.link_href,
    changed: true,
  };
}

export async function markAllCurrentUserNotificationsRead() {
  const userId = await requireCurrentUserId();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_read", false)
    .select("id");

  if (error) {
    unwrapSupabaseError(error, "Không thể đánh dấu tất cả thông báo đã đọc");
  }

  return {
    updatedCount: data?.length ?? 0,
  };
}
