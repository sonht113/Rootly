import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deriveRootLearningStatus, type RootLearningStatus } from "@/lib/root-learning-status";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RootWordDetail, RootWordRow } from "@/types/domain";
import type { RootWordInput } from "@/lib/validations/root-words";

import { unwrapSupabaseError } from "@/server/repositories/shared";

export async function getPublishedRootWords(filters?: { query?: string; level?: string }) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("root_words")
    .select("*, words(count)")
    .eq("is_published", true)
    .order("root");

  if (filters?.query) {
    query = query.or(`root.ilike.%${filters.query}%,meaning.ilike.%${filters.query}%`);
  }

  if (filters?.level) {
    query = query.eq("level", filters.level);
  }

  const { data, error } = await query;
  if (error) {
    unwrapSupabaseError(error, "Không thể tải thư viện từ gốc");
  }

  return (data ?? []) as Array<RootWordRow & { words: Array<{ count: number }> }>;
}

export interface LibraryRootWord extends RootWordRow {
  wordCount: number;
  previewWords: string[];
  moreWordsCount: number;
  originLabel: string;
  masteryProgress: number;
  learningStatus: RootLearningStatus;
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

function calculateMasteryProgress(
  plans: Array<{ status: string }>,
  reviews: Array<{ status: string }>,
) {
  const planWeights: Record<string, number> = {
    planned: 18,
    in_progress: 42,
    completed: 64,
    overdue: 10,
    skipped: 0,
  };

  const reviewWeights: Record<string, number> = {
    pending: 8,
    rescheduled: 6,
    done: 14,
    missed: 0,
  };

  const planScore = plans.reduce((maxScore, plan) => Math.max(maxScore, planWeights[plan.status] ?? 0), 0);
  const reviewScore = reviews.reduce((total, review) => total + (reviewWeights[review.status] ?? 0), 0);

  return Math.max(0, Math.min(100, planScore + reviewScore));
}

export async function getLibraryRootWords(filters?: { query?: string; level?: string; userId?: string | null }) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("root_words").select("*").eq("is_published", true).order("root");

  if (filters?.query) {
    query = query.or(`root.ilike.%${filters.query}%,meaning.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
  }

  if (filters?.level) {
    query = query.eq("level", filters.level);
  }

  const { data: rootWords, error } = await query;
  if (error) {
    unwrapSupabaseError(error, "Không thể tải thư viện từ gốc");
  }

  const baseRootWords = (rootWords ?? []) as RootWordRow[];
  if (baseRootWords.length === 0) {
    return [] as LibraryRootWord[];
  }

  const rootWordIds = baseRootWords.map((rootWord) => rootWord.id);
  const emptyPlanResult = Promise.resolve({
    data: [] as Array<{ root_word_id: string; status: string }>,
    error: null,
  });
  const [{ data: words, error: wordsError }, { data: plans, error: plansError }, { data: reviews, error: reviewsError }] =
    await Promise.all([
      supabase.from("words").select("root_word_id, word").in("root_word_id", rootWordIds).order("word"),
      filters?.userId
        ? supabase.from("user_root_plans").select("root_word_id, status").eq("user_id", filters.userId).in("root_word_id", rootWordIds)
        : emptyPlanResult,
      filters?.userId
        ? supabase
            .from("user_root_reviews")
            .select("root_word_id, status")
            .eq("user_id", filters.userId)
            .in("root_word_id", rootWordIds)
        : emptyPlanResult,
    ]);

  const nestedError = wordsError ?? plansError ?? reviewsError;
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

  return baseRootWords.map((rootWord) => {
    const relatedWords = wordsByRootId.get(rootWord.id) ?? [];
    const previewWords = relatedWords.slice(0, 3);
    const plansForRoot = plansByRootId.get(rootWord.id) ?? [];
    const reviewsForRoot = reviewsByRootId.get(rootWord.id) ?? [];
    const masteryProgress = calculateMasteryProgress(
      plansForRoot,
      reviewsForRoot,
    );

    return {
      ...rootWord,
      wordCount: relatedWords.length,
      previewWords,
      moreWordsCount: Math.max(0, relatedWords.length - previewWords.length),
      originLabel: formatOriginLabel(rootWord),
      masteryProgress,
      learningStatus: deriveRootLearningStatus(plansForRoot, reviewsForRoot),
    };
  });
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

  const { data, error } = await query;
  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách nội dung");
  }

  return (data ?? []) as Array<RootWordRow & { words: Array<{ count: number }> }>;
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

  await supabaseAdmin.from("words").delete().eq("root_word_id", rootWordId);

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
    await upsertRootWord(batch, createdBy);
  }

  return {
    importedCount: batches.length,
  };
}
