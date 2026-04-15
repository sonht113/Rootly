import { PageHeader } from "@/components/shared/page-header";
import { NotificationsInbox } from "@/features/notifications/components/notifications-inbox";
import { getCurrentNotificationsInbox } from "@/server/services/notifications-service";

export default async function NotificationsPage() {
  const { items, unreadCount } = await getCurrentNotificationsInbox();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Thông báo"
        title="Inbox hoạt động"
        description="Theo dõi các gợi ý mới từ lớp và đánh dấu trạng thái đã đọc ngay trong cùng một luồng làm việc."
        badgeText={unreadCount > 0 ? `${unreadCount} chưa đọc` : "Đã xử lý hết"}
      />

      <NotificationsInbox items={items} unreadCount={unreadCount} />
    </div>
  );
}
