import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateRootMasteryProgress } from "@/lib/root-mastery-progress";
import { deriveRootLearningStatus, type RootLearningStatus } from "@/lib/root-learning-status";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RootWordDetail, RootWordRow } from "@/types/domain";
import type { RootWordInput } from "@/lib/validations/root-words";

import { unwrapSupabaseError } from "@/server/repositories/shared";

export async function getPublishedRootWords(filters?: { query?: string; level?: string }) {
  const supabase = await createServerSupabaseClient();
  const searchContext = await resolveLibraryRootWordSearch(supabase, filters?.query);
  let query = supabase
    .from("root_words")
    .select("*, words(count)")
    .eq("is_published", true)
    .order("root");

  if (searchContext.searchClause) {
    query = query.or(searchContext.searchClause);
  }

  if (filters?.level) {
    query = query.eq("level", filters.level);
  }

  const { data, error } = await query;
  if (error) {
    unwrapSupabaseError(error, "Không thể tải thư viện từ gốc");
  }

  return sortLibraryRootWordsBySearchPriority(
    (data ?? []) as Array<RootWordRow & { words: Array<{ count: number }> }>,
    searchContext,
  );
}

export interface LibraryRootWord extends RootWordRow {
  wordCount: number;
  previewWords: string[];
  moreWordsCount: number;
  originLabel: string;
  masteryProgress: number;
  learningStatus: RootLearningStatus;
  ctaLabel: string;
  ctaHref: string;
}

export interface PaginatedLibraryRootWords {
  items: LibraryRootWord[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface PaginatedAdminRootWords {
  items: Array<RootWordRow & { words: Array<{ count: number }> }>;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface LibraryRootWordSearchContext {
  normalizedQuery: string | null;
  searchClause: string | null;
}

interface LibraryRootWordFilters {
  query?: string;
  level?: string;
  userId?: string | null;
}

interface PaginatedLibraryRootWordFilters extends LibraryRootWordFilters {
  page?: number;
  pageSize?: number;
}

interface AdminRootWordFilters {
  query?: string;
  published?: string;
}

interface PaginatedAdminRootWordFilters extends AdminRootWordFilters {
  page?: number;
  pageSize?: number;
}

interface LibraryReviewRow {
  id: string;
  root_word_id: string;
  status: string;
  review_date: string;
  review_step: number;
  completed_at: string | null;
  updated_at: string;
}

interface LibraryQuizAttemptRow {
  root_word_id: string;
}

interface LibraryStudySessionRow {
  root_word_id: string;
  session_type: string;
  result: Record<string, string | number | boolean | null> | null;
}

function formatOriginLabel(rootWord: Pick<RootWordRow, "meaning" | "description">) {
  const description = rootWord.description.trim();
  const meaning = rootWord.meaning.trim();

  const explicitOrigin = description.match(/^(Latin|Greek|Old English|Germanic|French|Arabic|Sanskrit)\s*:\s*(.+)$/i);
  if (explicitOrigin) {
    return `${explicitOrigin[1]}: ${explicitOrigin[2]}`;
  }

  return `Nghĩa: "${meaning}"`;
}

function getDistinctCompletedReviewSteps(studySessions: LibraryStudySessionRow[]) {
  const reviewStepsByRootId = new Map<string, Set<number>>();

  for (const session of studySessions) {
    if (session.session_type !== "review") {
      continue;
    }

    const reviewStepValue = session.result?.review_step;
    const normalizedReviewStep =
      typeof reviewStepValue === "number"
        ? reviewStepValue
        : typeof reviewStepValue === "string"
          ? Number.parseInt(reviewStepValue, 10)
          : Number.NaN;

    if (!Number.isFinite(normalizedReviewStep)) {
      continue;
    }

    const reviewSteps = reviewStepsByRootId.get(session.root_word_id) ?? new Set<number>();
    reviewSteps.add(Math.floor(normalizedReviewStep));
    reviewStepsByRootId.set(session.root_word_id, reviewSteps);
  }

  return new Map(
    Array.from(reviewStepsByRootId.entries()).map(([rootWordId, reviewSteps]) => [rootWordId, reviewSteps.size]),
  );
}

function getCompletedDetailViewsByRootId(studySessions: LibraryStudySessionRow[]) {
  return new Set(
    studySessions
      .filter((session) => session.session_type === "detail_view")
      .map((session) => session.root_word_id),
  );
}

function getCompletedQuizzesByRootId(quizAttempts: LibraryQuizAttemptRow[]) {
  return new Set(quizAttempts.map((quizAttempt) => quizAttempt.root_word_id));
}

function getNormalizedPositiveInteger(value: number | undefined, fallback: number) {
  if (!value || !Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
}

function buildLibraryRootWordsDirectSearchClause(query: string) {
  return `root.ilike.%${query}%,meaning.ilike.%${query}%,description.ilike.%${query}%`;
}

function buildRelatedWordsSearchClause(query: string) {
  return `word.ilike.%${query}%,meaning_en.ilike.%${query}%,meaning_vi.ilike.%${query}%`;
}

function matchesLibraryRootWordsDirectSearch(
  rootWord: Pick<RootWordRow, "root" | "meaning" | "description">,
  normalizedQuery: string,
) {
  const queryValue = normalizedQuery.toLocaleLowerCase();

  return [rootWord.root, rootWord.meaning, rootWord.description].some((value) =>
    value.toLocaleLowerCase().includes(queryValue),
  );
}

function sortLibraryRootWordsBySearchPriority<TRootWord extends Pick<RootWordRow, "root" | "meaning" | "description">>(
  rootWords: TRootWord[],
  searchContext?: LibraryRootWordSearchContext,
) {
  if (!searchContext?.normalizedQuery) {
    return rootWords;
  }

  return [...rootWords].sort((left, right) => {
    const leftMatchesDirectly = matchesLibraryRootWordsDirectSearch(left, searchContext.normalizedQuery!);
    const rightMatchesDirectly = matchesLibraryRootWordsDirectSearch(right, searchContext.normalizedQuery!);

    if (leftMatchesDirectly !== rightMatchesDirectly) {
      return leftMatchesDirectly ? -1 : 1;
    }

    return left.root.localeCompare(right.root);
  });
}

async function resolveLibraryRootWordSearch(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  query?: string,
): Promise<LibraryRootWordSearchContext> {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) {
    return {
      normalizedQuery: null,
      searchClause: null,
    };
  }

  const { data, error } = await supabase
    .from("words")
    .select("root_word_id")
    .or(buildRelatedWordsSearchClause(normalizedQuery));

  if (error) {
    unwrapSupabaseError(error, "Không thể tìm root word liên quan từ bảng words");
  }

  const matchedRootWordIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.root_word_id)
        .filter((rootWordId): rootWordId is string => typeof rootWordId === "string" && rootWordId.length > 0),
    ),
  );
  const clauses = [buildLibraryRootWordsDirectSearchClause(normalizedQuery)];

  if (matchedRootWordIds.length > 0) {
    clauses.push(`id.in.(${matchedRootWordIds.join(",")})`);
  }

  return {
    normalizedQuery,
    searchClause: clauses.join(","),
  };
}

async function getSortedLibraryRootWordsForSearch(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  filters: Pick<LibraryRootWordFilters, "query" | "level"> | undefined,
  searchContext: LibraryRootWordSearchContext,
) {
  const { data: rootWords, error } = await buildLibraryRootWordsDataQuery(supabase, filters, searchContext);

  if (error) {
    unwrapSupabaseError(error, "Không thể tải thư viện từ gốc");
  }

  return sortLibraryRootWordsBySearchPriority((rootWords ?? []) as RootWordRow[], searchContext);
}

function buildLibraryRootWordsDataQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  filters?: Pick<LibraryRootWordFilters, "query" | "level">,
  searchContext?: LibraryRootWordSearchContext,
) {
  let query = supabase.from("root_words").select("*").eq("is_published", true).order("root");

  if (searchContext?.searchClause) {
    query = query.or(searchContext.searchClause);
  }

  if (filters?.level) {
    query = query.eq("level", filters.level);
  }

  return query;
}

function buildLibraryRootWordsCountQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  filters?: Pick<LibraryRootWordFilters, "query" | "level">,
  searchContext?: LibraryRootWordSearchContext,
) {
  let query = supabase.from("root_words").select("*", { count: "exact", head: true }).eq("is_published", true);

  if (searchContext?.searchClause) {
    query = query.or(searchContext.searchClause);
  }

  if (filters?.level) {
    query = query.eq("level", filters.level);
  }

  return query;
}

function buildAdminRootWordsDataQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  filters?: AdminRootWordFilters,
) {
  let query = supabase
    .from("root_words")
    .select("*, words(count)")
    .order("updated_at", { ascending: false });

  if (filters?.query) {
    query = query.or(`root.ilike.%${filters.query}%,meaning.ilike.%${filters.query}%`);
  }

  if (filters?.published === "published") {
    query = query.eq("is_published", true);
  }

  if (filters?.published === "draft") {
    query = query.eq("is_published", false);
  }

  return query;
}

function buildAdminRootWordsCountQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  filters?: AdminRootWordFilters,
) {
  let query = supabase.from("root_words").select("id", { count: "exact", head: true });

  if (filters?.query) {
    query = query.or(`root.ilike.%${filters.query}%,meaning.ilike.%${filters.query}%`);
  }

  if (filters?.published === "published") {
    query = query.eq("is_published", true);
  }

  if (filters?.published === "draft") {
    query = query.eq("is_published", false);
  }

  return query;
}

function compareNullableDatesDescending(left: string | null, right: string | null) {
  if (left === right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return right.localeCompare(left);
}

function getActiveReviewIdByRootId(reviews: LibraryReviewRow[]) {
  const activeReviews = reviews
    .filter((review) => review.status === "pending" || review.status === "rescheduled")
    .sort((left, right) => {
      if (left.review_date !== right.review_date) {
        return left.review_date.localeCompare(right.review_date);
      }

      if (left.review_step !== right.review_step) {
        return left.review_step - right.review_step;
      }

      return right.updated_at.localeCompare(left.updated_at);
    });

  const activeReviewIdByRootId = new Map<string, string>();

  for (const review of activeReviews) {
    if (!activeReviewIdByRootId.has(review.root_word_id)) {
      activeReviewIdByRootId.set(review.root_word_id, review.id);
    }
  }

  return activeReviewIdByRootId;
}

function getLatestCompletedReviewIdByRootId(reviews: LibraryReviewRow[]) {
  const completedReviews = reviews
    .filter((review) => review.status === "done")
    .sort((left, right) => {
      const completedAtDelta = compareNullableDatesDescending(left.completed_at, right.completed_at);
      if (completedAtDelta !== 0) {
        return completedAtDelta;
      }

      if (left.review_step !== right.review_step) {
        return right.review_step - left.review_step;
      }

      return right.updated_at.localeCompare(left.updated_at);
    });

  const completedReviewIdByRootId = new Map<string, string>();

  for (const review of completedReviews) {
    if (!completedReviewIdByRootId.has(review.root_word_id)) {
      completedReviewIdByRootId.set(review.root_word_id, review.id);
    }
  }

  return completedReviewIdByRootId;
}

function getLibraryRootWordCta(
  rootWordId: string,
  learningStatus: RootLearningStatus,
  activeReviewId: string | null,
  latestCompletedReviewId: string | null,
) {
  if (learningStatus === "reviewing" && activeReviewId) {
    return {
      ctaLabel: "Ôn tập",
      ctaHref: `/library/${rootWordId}?reviewId=${activeReviewId}`,
    };
  }

  if (learningStatus === "remembered" && latestCompletedReviewId) {
    return {
      ctaLabel: "Ôn tập lại",
      ctaHref: `/library/${rootWordId}?reviewId=${latestCompletedReviewId}`,
    };
  }

  return {
    ctaLabel: "Học ngay",
    ctaHref: `/library/${rootWordId}`,
  };
}

async function hydrateLibraryRootWords(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  baseRootWords: RootWordRow[],
  userId?: string | null,
) {
  if (baseRootWords.length === 0) {
    return [] as LibraryRootWord[];
  }

  const rootWordIds = baseRootWords.map((rootWord) => rootWord.id);
  const emptyPlanResult = Promise.resolve({
    data: [] as Array<{ root_word_id: string; status: string }>,
    error: null,
  });
  const emptyReviewResult = Promise.resolve({
    data: [] as LibraryReviewRow[],
    error: null,
  });
  const emptyQuizAttemptResult = Promise.resolve({
    data: [] as LibraryQuizAttemptRow[],
    error: null,
  });
  const emptyStudySessionResult = Promise.resolve({
    data: [] as LibraryStudySessionRow[],
    error: null,
  });
  const [
    { data: words, error: wordsError },
    { data: plans, error: plansError },
    { data: reviews, error: reviewsError },
    { data: quizAttempts, error: quizAttemptsError },
    { data: studySessions, error: studySessionsError },
  ] =
    await Promise.all([
      supabase.from("words").select("root_word_id, word").in("root_word_id", rootWordIds).order("word"),
      userId
        ? supabase.from("user_root_plans").select("root_word_id, status").eq("user_id", userId).in("root_word_id", rootWordIds)
        : emptyPlanResult,
      userId
        ? supabase
            .from("user_root_reviews")
            .select("id, root_word_id, status, review_date, review_step, completed_at, updated_at")
            .eq("user_id", userId)
            .in("root_word_id", rootWordIds)
        : emptyReviewResult,
      userId
        ? supabase.from("quiz_attempts").select("root_word_id").eq("user_id", userId).in("root_word_id", rootWordIds)
        : emptyQuizAttemptResult,
      userId
        ? supabase
            .from("study_sessions")
            .select("root_word_id, session_type, result")
            .eq("user_id", userId)
            .in("root_word_id", rootWordIds)
            .in("session_type", ["detail_view", "review"])
        : emptyStudySessionResult,
    ]);

  const nestedError = wordsError ?? plansError ?? reviewsError ?? quizAttemptsError ?? studySessionsError;
  if (nestedError) {
    unwrapSupabaseError(nestedError, "Không thể tải dữ liệu mở rộng cho thư viện");
  }

  const wordsByRootId = new Map<string, string[]>();
  for (const word of words ?? []) {
    const groupedWords = wordsByRootId.get(word.root_word_id) ?? [];
    groupedWords.push(word.word);
    wordsByRootId.set(word.root_word_id, groupedWords);
  }

  const plansByRootId = new Map<string, Array<{ status: string }>>();
  for (const plan of plans ?? []) {
    const groupedPlans = plansByRootId.get(plan.root_word_id) ?? [];
    groupedPlans.push({ status: plan.status });
    plansByRootId.set(plan.root_word_id, groupedPlans);
  }

  const reviewsByRootId = new Map<string, Array<{ status: string }>>();
  for (const review of reviews ?? []) {
    const groupedReviews = reviewsByRootId.get(review.root_word_id) ?? [];
    groupedReviews.push({ status: review.status });
    reviewsByRootId.set(review.root_word_id, groupedReviews);
  }

  const activeReviewIdByRootId = getActiveReviewIdByRootId((reviews ?? []) as LibraryReviewRow[]);
  const latestCompletedReviewIdByRootId = getLatestCompletedReviewIdByRootId((reviews ?? []) as LibraryReviewRow[]);
  const detailViewCompletedByRootId = getCompletedDetailViewsByRootId((studySessions ?? []) as LibraryStudySessionRow[]);
  const quizCompletedByRootId = getCompletedQuizzesByRootId((quizAttempts ?? []) as LibraryQuizAttemptRow[]);
  const completedReviewStepsByRootId = getDistinctCompletedReviewSteps((studySessions ?? []) as LibraryStudySessionRow[]);

  return baseRootWords.map((rootWord) => {
    const relatedWords = wordsByRootId.get(rootWord.id) ?? [];
    const previewWords = relatedWords.slice(0, 3);
    const plansForRoot = plansByRootId.get(rootWord.id) ?? [];
    const reviewsForRoot = reviewsByRootId.get(rootWord.id) ?? [];
    const masteryProgress = calculateRootMasteryProgress({
      hasCompletedDetailView: detailViewCompletedByRootId.has(rootWord.id),
      hasCompletedQuiz: quizCompletedByRootId.has(rootWord.id),
      completedReviewSteps: completedReviewStepsByRootId.get(rootWord.id) ?? 0,
      isRemembered: reviewsForRoot.some((review) => review.status === "done"),
    });
    const learningStatus = deriveRootLearningStatus(plansForRoot, reviewsForRoot);
    const { ctaLabel, ctaHref } = getLibraryRootWordCta(
      rootWord.id,
      learningStatus,
      activeReviewIdByRootId.get(rootWord.id) ?? null,
      latestCompletedReviewIdByRootId.get(rootWord.id) ?? null,
    );

    return {
      ...rootWord,
      wordCount: relatedWords.length,
      previewWords,
      moreWordsCount: Math.max(0, relatedWords.length - previewWords.length),
      originLabel: formatOriginLabel(rootWord),
      masteryProgress,
      learningStatus,
      ctaLabel,
      ctaHref,
    };
  });
}

export async function getLibraryRootWords(filters?: LibraryRootWordFilters) {
  const supabase = await createServerSupabaseClient();
  const searchContext = await resolveLibraryRootWordSearch(supabase, filters?.query);
  const rootWords = await getSortedLibraryRootWordsForSearch(supabase, filters, searchContext);

  return hydrateLibraryRootWords(supabase, rootWords, filters?.userId ?? null);
}

export async function getPaginatedLibraryRootWords(filters?: PaginatedLibraryRootWordFilters): Promise<PaginatedLibraryRootWords> {
  const supabase = await createServerSupabaseClient();
  const requestedPage = getNormalizedPositiveInteger(filters?.page, 1);
  const pageSize = getNormalizedPositiveInteger(filters?.pageSize, 10);
  const searchContext = await resolveLibraryRootWordSearch(supabase, filters?.query);

  if (searchContext.normalizedQuery) {
    const matchedRootWords = await getSortedLibraryRootWordsForSearch(supabase, filters, searchContext);
    const totalCount = matchedRootWords.length;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;
    const currentPage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;

    if (totalCount === 0) {
      return {
        items: [],
        totalCount,
        totalPages,
        currentPage,
        pageSize,
      };
    }

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize;
    const items = await hydrateLibraryRootWords(
      supabase,
      matchedRootWords.slice(from, to),
      filters?.userId ?? null,
    );

    return {
      items,
      totalCount,
      totalPages,
      currentPage,
      pageSize,
    };
  }

  const { count, error: countError } = await buildLibraryRootWordsCountQuery(supabase, filters, searchContext);

  if (countError) {
    unwrapSupabaseError(countError, "Không thể đếm số lượng root word trong thư viện");
  }

  const totalCount = Number(count ?? 0);
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;
  const currentPage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;

  if (totalCount === 0) {
    return {
      items: [],
      totalCount,
      totalPages,
      currentPage,
      pageSize,
    };
  }

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: rootWords, error } = await buildLibraryRootWordsDataQuery(supabase, filters, searchContext).range(from, to);

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách root word theo trang");
  }

  const items = await hydrateLibraryRootWords(supabase, (rootWords ?? []) as RootWordRow[], filters?.userId ?? null);

  return {
    items,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
  };
}

export async function getRootWordDetail(rootId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("root_words")
    .select("*, words(*, example_sentences(*))")
    .eq("id", rootId)
    .single();

  if (error) {
    unwrapSupabaseError(error, "Không thể tải chi tiết từ gốc");
  }

  return data as RootWordDetail;
}

export async function getAdminRootWords(filters?: { query?: string; published?: string }) {
  const supabase = await createServerSupabaseClient();
  const query = buildAdminRootWordsDataQuery(supabase, filters);

  const { data, error } = await query;
  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách nội dung");
  }

  return (data ?? []) as Array<RootWordRow & { words: Array<{ count: number }> }>;
}

export async function getPaginatedAdminRootWords(
  filters?: PaginatedAdminRootWordFilters,
): Promise<PaginatedAdminRootWords> {
  const supabase = await createServerSupabaseClient();
  const requestedPage = getNormalizedPositiveInteger(filters?.page, 1);
  const pageSize = getNormalizedPositiveInteger(filters?.pageSize, 10);
  const { count, error: countError } = await buildAdminRootWordsCountQuery(supabase, filters);

  if (countError) {
    unwrapSupabaseError(countError, "Không thể đếm số lượng root word cần quản lý");
  }

  const totalCount = Number(count ?? 0);
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;
  const currentPage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1;

  if (totalCount === 0) {
    return {
      items: [],
      totalCount,
      totalPages,
      currentPage,
      pageSize,
    };
  }

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await buildAdminRootWordsDataQuery(supabase, filters).range(from, to);

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách root word theo trang cho admin");
  }

  return {
    items: (data ?? []) as Array<RootWordRow & { words: Array<{ count: number }> }>,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
  };
}

export async function upsertRootWord(input: RootWordInput, createdBy: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: rootData, error: rootError } = await supabaseAdmin
    .from("root_words")
    .upsert(
      {
        id: input.id,
        root: input.root,
        meaning: input.meaning,
        description: input.description,
        level: input.level,
        tags: input.tags,
        is_published: input.is_published,
        created_by: createdBy,
      },
      {
        onConflict: "root",
      },
    )
    .select()
    .single();

  if (rootError || !rootData) {
    unwrapSupabaseError(rootError, "Không thể lưu từ gốc");
  }

  const rootWordId = rootData.id as string;

  const { error: deleteWordsError } = await supabaseAdmin.from("words").delete().eq("root_word_id", rootWordId);
  if (deleteWordsError) {
    throw new Error(`Khong the lam moi danh sach tu cua root "${input.root}". ${deleteWordsError.message}`);
  }

  for (const word of input.words) {
    const { data: wordData, error: wordError } = await supabaseAdmin
      .from("words")
      .insert({
        root_word_id: rootWordId,
        word: word.word,
        part_of_speech: word.part_of_speech,
        pronunciation: word.pronunciation ?? null,
        meaning_en: word.meaning_en,
        meaning_vi: word.meaning_vi,
      })
      .select()
      .single();

    if (wordError || !wordData) {
      unwrapSupabaseError(wordError, "Không thể lưu danh sách từ vựng");
    }

    const payload = word.example_sentences.map((sentence) => ({
      word_id: wordData.id,
      english_sentence: sentence.english_sentence,
      vietnamese_sentence: sentence.vietnamese_sentence,
      usage_context: sentence.usage_context ?? null,
      is_daily_usage: sentence.is_daily_usage,
    }));

    if (payload.length > 0) {
      const { error: sentenceError } = await supabaseAdmin.from("example_sentences").insert(payload);
      if (sentenceError) {
        unwrapSupabaseError(sentenceError, "Không thể lưu ví dụ câu");
      }
    }
  }

  return rootWordId;
}

export async function deleteRootWord(rootWordId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("root_words").delete().eq("id", rootWordId);
  if (error) {
    unwrapSupabaseError(error, "Không thể xóa từ gốc");
  }
}

export async function importRootWordBatches(batches: RootWordInput[], createdBy: string) {
  for (const batch of batches) {
    try {
      await upsertRootWord(batch, createdBy);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Khong the import root "${batch.root}". ${error.message}`);
      }

      throw new Error(`Khong the import root "${batch.root}".`);
    }
  }

  return {
    importedCount: batches.length,
  };
}
