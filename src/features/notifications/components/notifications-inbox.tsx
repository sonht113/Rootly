"use client";

import { Bell, CheckCheck, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions/notifications";
import type { NotificationListItem } from "@/features/notifications/lib/notification-presenter";
import { cn } from "@/lib/utils/cn";

interface NotificationsInboxProps {
  items: NotificationListItem[];
  unreadCount: number;
}

export function NotificationsInbox({ items, unreadCount }: NotificationsInboxProps) {
  const router = useRouter();
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const [isItemPending, startItemTransition] = useTransition();
  const [isMarkAllPending, startMarkAllTransition] = useTransition();

  if (items.length === 0) {
    return (
      <EmptyState
        title="Chưa có thông báo nào"
        description="Khi có gợi ý mới từ lớp hoặc các cập nhật quan trọng, chúng sẽ xuất hiện ở đây."
        actionLabel="Mở hôm nay"
        actionHref="/today"
      />
    );
  }

  function handleOpenNotification(item: NotificationListItem) {
    if (!item.linkHref) {
      return;
    }

    const linkHref = item.linkHref;

    if (item.isRead) {
      router.push(linkHref);
      return;
    }

    setActiveNotificationId(item.id);
    startItemTransition(async () => {
      const result = await markNotificationReadAction({
        notificationId: item.id,
      });

      if (!result.success) {
        toast.error(result.message);
        setActiveNotificationId(null);
        return;
      }

      router.push(linkHref);
      router.refresh();
      setActiveNotificationId(null);
    });
  }

  function handleMarkNotificationRead(item: NotificationListItem) {
    setActiveNotificationId(item.id);
    startItemTransition(async () => {
      const result = await markNotificationReadAction({
        notificationId: item.id,
      });

      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success(result.message);
        router.refresh();
      }

      setActiveNotificationId(null);
    });
  }

  function handleMarkAllAsRead() {
    startMarkAllTransition(async () => {
      const result = await markAllNotificationsReadAction();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border border-[color:var(--border)] bg-white shadow-[var(--shadow-soft)]">
        <CardContent className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#e9f1ff] text-[#0058be]">
              <Bell className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#191c1e]">Tổng quan inbox</p>
              <p className="text-sm text-[color:var(--muted-foreground)]">
                {unreadCount > 0 ? `Bạn còn ${unreadCount} thông báo chưa đọc.` : "Tất cả thông báo đã được xử lý."}
              </p>
            </div>
          </div>

          <Button type="button" variant="outline" disabled={unreadCount === 0 || isMarkAllPending} onClick={handleMarkAllAsRead}>
            {isMarkAllPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
            Đánh dấu tất cả đã đọc
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.map((item) => {
          const isPending = isItemPending && activeNotificationId === item.id;

          return (
            <Card
              key={item.id}
              className={cn(
                "border transition-colors",
                item.isRead ? "border-[color:var(--border)] bg-white" : "border-[#bfd4ff] bg-[#f7faff]",
              )}
            >
              <CardContent className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.isRead ? "outline" : "default"}>{item.typeLabel}</Badge>
                    {!item.isRead ? <Badge variant="success">Mới</Badge> : null}
                    <span className="text-xs text-[color:var(--muted-foreground)]">{item.createdAtLabel}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-[#191c1e]">{item.title}</p>
                    <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{item.message}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {!item.isRead ? (
                    <Button type="button" variant="ghost" disabled={isPending} onClick={() => handleMarkNotificationRead(item)}>
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                      Đánh dấu đã đọc
                    </Button>
                  ) : null}

                  {item.linkHref ? (
                    <Button type="button" variant="accent" disabled={isPending} onClick={() => handleOpenNotification(item)}>
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                      Mở
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
