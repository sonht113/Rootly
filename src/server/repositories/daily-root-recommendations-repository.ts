import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DailyRootRecommendationRow, RootLevel } from "@/types/domain";

import { unwrapSupabaseError } from "@/server/repositories/shared";

interface RootWordSummary {
  id: string;
  root: string;
  meaning: string;
  level: RootLevel;
}

interface DailyRootRecommendationRecord extends DailyRootRecommendationRow {
  root_word: RootWordSummary | RootWordSummary[] | null;
}

export interface DailyRootRecommendation {
  id: string;
  recommendationDate: string;
  rootWordId: string;
  selectedBy: string | null;
  rootWord: RootWordSummary;
}

function getVietnamDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
}

function resolveRootWordSummary(rootWord: DailyRootRecommendationRecord["root_word"]) {
  return Array.isArray(rootWord) ? (rootWord[0] ?? null) : rootWord;
}

function mapDailyRootRecommendation(record: DailyRootRecommendationRecord | null): DailyRootRecommendation | null {
  if (!record) {
    return null;
  }

  const rootWord = resolveRootWordSummary(record.root_word);

  if (!rootWord) {
    return null;
  }

  return {
    id: record.id,
    recommendationDate: record.recommendation_date,
    rootWordId: record.root_word_id,
    selectedBy: record.selected_by,
    rootWord,
  };
}

export async function getDailyRootRecommendationForDate(date: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("daily_root_recommendations")
    .select("id, recommendation_date, root_word_id, selected_by, root_word:root_words!inner(id, root, meaning, level)")
    .eq("recommendation_date", date)
    .maybeSingle();

  if (error) {
    unwrapSupabaseError(error, "Khong the tai root tu de xuat theo ngay");
  }

  return mapDailyRootRecommendation((data ?? null) as DailyRootRecommendationRecord | null);
}

export async function getTodayDailyRootRecommendation() {
  return getDailyRootRecommendationForDate(getVietnamDateString());
}

export async function setTodayDailyRootRecommendation(rootWordId: string, selectedBy: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: rootWord, error: rootWordError } = await supabaseAdmin
    .from("root_words")
    .select("id, root, is_published")
    .eq("id", rootWordId)
    .maybeSingle();

  if (rootWordError) {
    unwrapSupabaseError(rootWordError, "Khong the kiem tra root word duoc de xuat");
  }

  if (!rootWord || !rootWord.is_published) {
    throw new Error("Chi co the de xuat root word da xuat ban.");
  }

  const recommendationDate = getVietnamDateString();
  const { data, error } = await supabaseAdmin
    .from("daily_root_recommendations")
    .upsert(
      {
        recommendation_date: recommendationDate,
        root_word_id: rootWordId,
        selected_by: selectedBy,
      },
      {
        onConflict: "recommendation_date",
      },
    )
    .select("id, recommendation_date, root_word_id, selected_by, root_word:root_words!inner(id, root, meaning, level)")
    .single();

  if (error) {
    unwrapSupabaseError(error, "Khong the luu root tu de xuat hom nay");
  }

  return mapDailyRootRecommendation(data as DailyRootRecommendationRecord);
}
