import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReviewQueue } from "@/features/reviews/components/review-queue";
import { getReviewQueue } from "@/server/repositories/study-repository";

export default async function ReviewsPage() {
  const reviews = await getReviewQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ôn tập"
        title="Hàng đợi ôn tập"
        description="Đi lần lượt từng từ gốc đến hạn, đánh dấu nhớ hoặc cần ôn lại và giữ cho lộ trình lặp lại ngắt quãng luôn đúng nhịp."
      />
      {reviews.length === 0 ? (
        <EmptyState
          title="Bạn đã hoàn tất các lượt ôn tập hiện tại"
          description="Tiếp tục lên lịch học mới hoặc quay lại dashboard để xem gợi ý học tiếp theo."
          actionHref="/today"
          actionLabel="Quay về hôm nay"
        />
      ) : (
        <ReviewQueue items={reviews} />
      )}
    </div>
  );
}
