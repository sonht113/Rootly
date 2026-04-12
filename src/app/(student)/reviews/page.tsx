import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReviewCard } from "@/features/reviews/components/review-card";
import { getReviewCardItems } from "@/server/repositories/study-repository";

export default async function ReviewsPage() {
  const reviews = await getReviewCardItems();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ôn tập"
        title="Danh sách ôn tập"
        description="Chọn một root word đang trong chu kỳ ôn tập, mở màn chi tiết để xem lại nội dung và cập nhật trạng thái ghi nhớ."
      />

      {reviews.length === 0 ? (
        <EmptyState
          title="Bạn đã hoàn tất các lượt ôn tập hiện tại"
          description="Tiếp tục lên lịch học mới hoặc quay lại dashboard để xem gợi ý học tiếp theo."
          actionHref="/today"
          actionLabel="Quay về hôm nay"
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              href={`/library/${review.rootWordId}?reviewId=${review.id}`}
              root={review.root}
              meaning={review.meaning}
              reviewStep={review.reviewStep}
              dueLabel={review.dueLabel}
            />
          ))}
        </section>
      )}
    </div>
  );
}
