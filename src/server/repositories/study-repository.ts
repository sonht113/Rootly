import { differenceInCalendarDays, formatDistanceStrict, isToday, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SchedulePlanInput, UpdatePlanInput } from "@/lib/validations/study-plans";
import type { ProgressSummaryData, TodayDashboardData, UserRootPlanRow, UserRootReviewRow } from "@/types/domain";
import { unwrapSupabaseError } from "@/server/repositories/shared";

const ACTIVE_PLAN_STATUSES = ["planned", "overdue", "in_progress"] as const;
const ACTIVE_REVIEW_STATUSES = ["pending", "rescheduled"] as const;
const DETAIL_REVIEW_STATUSES = ["pending", "rescheduled", "done"] as const;
const USER_ROOT_PLAN_UNIQUE_CONSTRAINTS = [
  "user_root_plans_user_id_root_word_id_key",
  "user_root_plans_user_id_root_word_id_scheduled_date_key",
] as const;
const PLAN_ALREADY_EXISTS_MESSAGE =
  "Từ gốc này đã có trong lịch học của bạn. Hãy hoàn thành hoặc xóa lịch cũ trước khi thêm lại.";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

interface ActivePlanCandidate {
  id: string;
  scheduled_date: string;
  created_at: string;
}

export interface ReviewCardItem {
  id: string;
  rootWordId: string;
  root: string;
  meaning: string;
  reviewStep: number;
  reviewDate: string;
  dueLabel: string;
}

export interface RootWordReviewContext {
  id: string;
  rootWordId: string;
  reviewStep: number;
  reviewDate: string;
  dueLabel: string;
  status: typeof DETAIL_REVIEW_STATUSES[number];
}

function getLocalTodayDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function selectNearestActivePlan(plans: ActivePlanCandidate[]) {
  const today = parseISO(getLocalTodayDateString());

  return [...plans].sort((left, right) => {
    const leftDate = parseISO(left.scheduled_date);
    const rightDate = parseISO(right.scheduled_date);
    const leftDistance = differenceInCalendarDays(leftDate, today);
    const rightDistance = differenceInCalendarDays(rightDate, today);
    const distanceDelta = Math.abs(leftDistance) - Math.abs(rightDistance);

    if (distanceDelta !== 0) {
      return distanceDelta;
    }

    const leftIsDueOrPast = leftDistance <= 0;
    const rightIsDueOrPast = rightDistance <= 0;
    if (leftIsDueOrPast !== rightIsDueOrPast) {
      return leftIsDueOrPast ? -1 : 1;
    }

    if (left.scheduled_date !== right.scheduled_date) {
      return right.scheduled_date.localeCompare(left.scheduled_date);
    }

    return right.created_at.localeCompare(left.created_at);
  })[0] ?? null;
}

function formatReviewDueLabel(reviewDateString: string) {
  const todayString = getLocalTodayDateString();
  if (reviewDateString === todayString) {
    return "Đến hạn hôm nay";
  }

  return `Đến hạn ${formatDistanceStrict(parseISO(reviewDateString), parseISO(todayString), {
    addSuffix: true,
    locale: vi,
  })}`;
}

function isUserRootPlanUniqueViolation(error: { message?: string } | null) {
  if (!error?.message) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  return (
    normalizedMessage.includes("duplicate key value violates unique constraint") &&
    USER_ROOT_PLAN_UNIQUE_CONSTRAINTS.some((constraint) => normalizedMessage.includes(constraint))
  );
}

async function requireCurrentUser(supabase: ServerSupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    unwrapSupabaseError(error, "Không thể xác thực người dùng hiện tại");
  }

  if (!user) {
    throw new Error("Bạn cần đăng nhập để quản lý lịch học.");
  }

  return user;
}

async function getExistingPlanForRootWord(
  supabase: ServerSupabaseClient,
  userId: string,
  rootWordId: string,
  options?: { excludePlanId?: string },
) {
  let query = supabase
    .from("user_root_plans")
    .select("id, root_word_id, source")
    .eq("user_id", userId)
    .eq("root_word_id", rootWordId);

  if (options?.excludePlanId) {
    query = query.neq("id", options.excludePlanId);
  }

  const { data, error } = await query.order("created_at", { ascending: true }).limit(1);

  if (error) {
    unwrapSupabaseError(error, "Không thể kiểm tra lịch học hiện tại");
  }

  return (data ?? [])[0] ?? null;
}

export async function syncDueStatuses() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("sync_due_statuses");
  if (error) {
    unwrapSupabaseError(error, "Không thể đồng bộ trạng thái học");
  }
}

export async function getTodayDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_today_dashboard");
  if (error) {
    unwrapSupabaseError(error, "Không thể tải dashboard hôm nay");
  }

  return data as TodayDashboardData;
}

export async function getCurrentStreak() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("current_streak");

  if (error) {
    unwrapSupabaseError(error, "Không thể tải chuỗi ngày hiện tại");
  }

  return Number(data ?? 0);
}

interface RecordRootWordDetailViewResult {
  recorded: boolean;
  sessionId: string | null;
}

export async function recordRootWordDetailView(rootWordId: string): Promise<RecordRootWordDetailViewResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("record_root_word_detail_view", {
    p_root_word_id: rootWordId,
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể ghi nhận lượt xem chi tiết từ gốc");
  }

  const raw = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};

  return {
    recorded: raw.recorded === true,
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : null,
  };
}

export async function getRootLearningSnapshot(rootWordId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      hasPlan: false,
      nextReviewDate: null as string | null,
      nextReviewText: "Thêm từ gốc này để bắt đầu một chu kỳ lặp lại ngắt quãng.",
    };
  }

  const today = getLocalTodayDateString();
  const [
    { data: plans, error: plansError },
    { data: nextReview, error: reviewError },
  ] = await Promise.all([
    supabase
      .from("user_root_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("root_word_id", rootWordId)
      .limit(1),
    supabase
      .from("user_root_reviews")
      .select("review_date")
      .eq("user_id", user.id)
      .eq("root_word_id", rootWordId)
      .in("status", ["pending", "rescheduled"])
      .gte("review_date", today)
      .order("review_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const error = plansError ?? reviewError;
  if (error) {
    unwrapSupabaseError(error, "Không thể tải tiến độ học của từ gốc");
  }

  if (nextReview?.review_date) {
    const reviewDate = parseISO(nextReview.review_date);

    return {
      hasPlan: (plans?.length ?? 0) > 0,
      nextReviewDate: nextReview.review_date,
      nextReviewText: isToday(reviewDate)
        ? "Lượt ôn tiếp theo là hôm nay (lặp lại ngắt quãng)"
        : `Lượt ôn tiếp theo ${formatDistanceStrict(new Date(), reviewDate, { locale: vi, addSuffix: true })} (lặp lại ngắt quãng)`,
    };
  }

  if ((plans?.length ?? 0) > 0) {
    return {
      hasPlan: true,
      nextReviewDate: null as string | null,
      nextReviewText: "Đã thêm vào lịch học. Lượt ôn tập sẽ mở sau buổi học đầu tiên của bạn.",
    };
  }

  return {
    hasPlan: false,
    nextReviewDate: null as string | null,
    nextReviewText: "Thêm từ gốc này để bắt đầu một chu kỳ lặp lại ngắt quãng.",
  };
}

export async function getDailyGoalSummary() {
  const supabase = await createServerSupabaseClient();
  const today = getLocalTodayDateString();

  const [
    { count: totalPlans, error: totalPlansError },
    { count: completedPlans, error: completedPlansError },
    { count: totalReviews, error: totalReviewsError },
    { count: completedReviews, error: completedReviewsError },
  ] = await Promise.all([
    supabase
      .from("user_root_plans")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .neq("status", "skipped"),
    supabase
      .from("user_root_plans")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .eq("status", "completed"),
    supabase
      .from("user_root_reviews")
      .select("*", { count: "exact", head: true })
      .eq("review_date", today)
      .in("status", ["pending", "done"]),
    supabase
      .from("user_root_reviews")
      .select("*", { count: "exact", head: true })
      .eq("review_date", today)
      .eq("status", "done"),
  ]);

  const error = totalPlansError ?? completedPlansError ?? totalReviewsError ?? completedReviewsError;

  if (error) {
    unwrapSupabaseError(error, "Không thể tải mục tiêu hằng ngày");
  }

  const total = Number(totalPlans ?? 0) + Number(totalReviews ?? 0);
  const completed = Number(completedPlans ?? 0) + Number(completedReviews ?? 0);

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export async function getWeeklyCalendar() {
  await syncDueStatuses();

  const supabase = await createServerSupabaseClient();
  const { data: plans, error: planError } = await supabase
    .from("user_root_plans")
    .select("*, root_word:root_words(id, root, meaning, level)")
    .order("scheduled_date");

  if (planError) {
    unwrapSupabaseError(planError, "Không thể tải kế hoạch học");
  }

  const { data: reviews, error: reviewError } = await supabase
    .from("user_root_reviews")
    .select("*, root_word:root_words(id, root, meaning)")
    .order("review_date");

  if (reviewError) {
    unwrapSupabaseError(reviewError, "Không thể tải lịch ôn tập");
  }

  return {
    plans: (plans ?? []) as Array<UserRootPlanRow & { root_word: { id: string; root: string; meaning: string; level: string } }>,
    reviews: (reviews ?? []) as Array<UserRootReviewRow & { root_word: { id: string; root: string; meaning: string } }>,
  };
}

export async function createStudyPlan(input: SchedulePlanInput) {
  const supabase = await createServerSupabaseClient();
  const user = await requireCurrentUser(supabase);
  const existingPlan = await getExistingPlanForRootWord(supabase, user.id, input.rootWordId);

  if (existingPlan) {
    throw new Error(PLAN_ALREADY_EXISTS_MESSAGE);
  }

  const { error } = await supabase.from("user_root_plans").insert({
    user_id: user.id,
    root_word_id: input.rootWordId,
    scheduled_date: input.scheduledDate,
    source: input.source,
  });

  if (error) {
    if (isUserRootPlanUniqueViolation(error)) {
      throw new Error(PLAN_ALREADY_EXISTS_MESSAGE);
    }

    unwrapSupabaseError(error, "Không thể tạo lịch học");
  }
}

export async function updateStudyPlan(input: UpdatePlanInput) {
  const supabase = await createServerSupabaseClient();
  const user = await requireCurrentUser(supabase);
  const existingPlan = await getExistingPlanForRootWord(supabase, user.id, input.rootWordId, {
    excludePlanId: input.id,
  });

  if (existingPlan) {
    throw new Error(PLAN_ALREADY_EXISTS_MESSAGE);
  }

  const { error } = await supabase
    .from("user_root_plans")
    .update({
      root_word_id: input.rootWordId,
      scheduled_date: input.scheduledDate,
      source: input.source,
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) {
    if (isUserRootPlanUniqueViolation(error)) {
      throw new Error(PLAN_ALREADY_EXISTS_MESSAGE);
    }

    unwrapSupabaseError(error, "Không thể cập nhật lịch học");
  }
}

export async function deleteStudyPlan(planId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("user_root_plans").delete().eq("id", planId);

  if (error) {
    unwrapSupabaseError(error, "Không thể xóa lịch học");
  }
}

export async function completeStudyPlan(planId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("complete_learning_plan", {
    p_plan_id: planId,
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể hoàn thành buổi học");
  }

  return data;
}

export async function completeNearestActiveStudyPlanForRootWord(rootWordId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      completed: false,
      planId: null as string | null,
    };
  }

  const { data: plans, error } = await supabase
    .from("user_root_plans")
    .select("id, scheduled_date, created_at")
    .eq("user_id", user.id)
    .eq("root_word_id", rootWordId)
    .in("status", [...ACTIVE_PLAN_STATUSES]);

  if (error) {
    unwrapSupabaseError(error, "Không thể tải lịch học đang hoạt động");
  }

  const nearestPlan = selectNearestActivePlan((plans ?? []) as ActivePlanCandidate[]);
  if (!nearestPlan) {
    return {
      completed: false,
      planId: null as string | null,
    };
  }

  await completeStudyPlan(nearestPlan.id);

  return {
    completed: true,
    planId: nearestPlan.id,
  };
}

export async function getReviewQueue() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("user_root_reviews")
    .select("*, root_word:root_words(*, words(*, example_sentences(*)))")
    .in("status", ["pending", "rescheduled"])
    .order("review_date");

  if (error) {
    unwrapSupabaseError(error, "Không thể tải hàng đợi ôn tập");
  }

  return data ?? [];
}

export async function getReviewCardItems(): Promise<ReviewCardItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("user_root_reviews")
    .select("id, root_word_id, review_date, review_step, status, root_word:root_words(id, root, meaning)")
    .in("status", [...ACTIVE_REVIEW_STATUSES])
    .order("review_date", { ascending: true })
    .order("review_step", { ascending: true });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách ôn tập");
  }

  const reviews = ((data ?? []) as unknown as Array<{
    id: string;
    root_word_id: string;
    review_date: string;
    review_step: number;
    status: typeof ACTIVE_REVIEW_STATUSES[number];
    root_word:
      | {
          id: string;
          root: string;
          meaning: string;
        }
      | Array<{
          id: string;
          root: string;
          meaning: string;
        }>
      | null;
  }>);
  const firstReviewByRoot = new Map<
    string,
    {
      id: string;
      root_word_id: string;
      review_date: string;
      review_step: number;
      root_word: {
        id: string;
        root: string;
        meaning: string;
      };
    }
  >();

  for (const review of reviews) {
    const rootWord = Array.isArray(review.root_word) ? review.root_word[0] : review.root_word;

    if (!rootWord || firstReviewByRoot.has(review.root_word_id)) {
      continue;
    }

    firstReviewByRoot.set(review.root_word_id, {
      id: review.id,
      root_word_id: review.root_word_id,
      review_date: review.review_date,
      review_step: review.review_step,
      root_word: rootWord,
    });
  }

  return Array.from(firstReviewByRoot.values()).map((review) => ({
    id: review.id,
    rootWordId: review.root_word_id,
    root: review.root_word.root,
    meaning: review.root_word.meaning,
    reviewStep: review.review_step,
    reviewDate: review.review_date,
    dueLabel: formatReviewDueLabel(review.review_date),
  }));
}

export async function getRootWordReviewContext(rootWordId: string, reviewId: string): Promise<RootWordReviewContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_root_reviews")
    .select("id, root_word_id, review_date, review_step, status")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .eq("root_word_id", rootWordId)
    .in("status", [...DETAIL_REVIEW_STATUSES])
    .maybeSingle();

  if (error) {
    unwrapSupabaseError(error, "Không thể tải lượt ôn tập cho từ gốc này");
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    rootWordId: data.root_word_id,
    reviewStep: data.review_step,
    reviewDate: data.review_date,
    dueLabel: formatReviewDueLabel(data.review_date),
    status: data.status as RootWordReviewContext["status"],
  };
}

export async function submitReview(reviewId: string, remembered: boolean) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("submit_review_result", {
    p_review_id: reviewId,
    p_remembered: remembered,
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể lưu kết quả ôn tập");
  }

  return data;
}

export async function getProgressSummary() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_progress_summary");
  if (error) {
    unwrapSupabaseError(error, "Không thể tải tiến độ học tập");
  }

  return data as ProgressSummaryData;
}
