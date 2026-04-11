import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RootWordQuizQuestionInput } from "@/lib/validations/root-word-quizzes";
import type {
  RootWordQuizQuestionRow,
  RootWordQuizSetDetail,
  RootWordQuizSetRow,
  RootWordQuizSummary,
} from "@/types/domain";

import { unwrapSupabaseError } from "@/server/repositories/shared";

const ACTIVE_QUIZ_EXISTS_MESSAGE = "Từ gốc này đã có quiz. Hãy xóa quiz hiện tại trước khi nhập bộ mới.";

async function getQuizSetByRootWordId(rootWordId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("root_word_quiz_sets")
    .select("*")
    .eq("root_word_id", rootWordId)
    .maybeSingle();

  if (error) {
    unwrapSupabaseError(error, "Không thể tải thông tin quiz của từ gốc");
  }

  return (data ?? null) as RootWordQuizSetRow | null;
}

export async function getRootWordQuizSummary(rootWordId: string): Promise<RootWordQuizSummary> {
  const quizSet = await getQuizSetByRootWordId(rootWordId);

  return {
    rootWordId,
    quizSetId: quizSet?.id ?? null,
    questionCount: quizSet?.question_count ?? 0,
    hasQuiz: Boolean(quizSet),
  };
}

export async function getRootWordQuizSetDetail(rootWordId: string): Promise<RootWordQuizSetDetail | null> {
  const quizSet = await getQuizSetByRootWordId(rootWordId);
  if (!quizSet) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data: questions, error } = await supabase
    .from("root_word_quiz_questions")
    .select("*")
    .eq("quiz_set_id", quizSet.id)
    .order("position", { ascending: true });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách câu hỏi quiz");
  }

  return {
    ...quizSet,
    questions: (questions ?? []) as RootWordQuizQuestionRow[],
  };
}

export async function getQuizSetForSubmission(rootWordId: string, quizSetId: string): Promise<RootWordQuizSetDetail | null> {
  const supabase = await createServerSupabaseClient();
  const { data: quizSet, error: quizSetError } = await supabase
    .from("root_word_quiz_sets")
    .select("*")
    .eq("id", quizSetId)
    .eq("root_word_id", rootWordId)
    .maybeSingle();

  if (quizSetError) {
    unwrapSupabaseError(quizSetError, "Không thể tải bộ quiz để chấm điểm");
  }

  if (!quizSet) {
    return null;
  }

  const { data: questions, error: questionsError } = await supabase
    .from("root_word_quiz_questions")
    .select("*")
    .eq("quiz_set_id", quizSetId)
    .order("position", { ascending: true });

  if (questionsError) {
    unwrapSupabaseError(questionsError, "Không thể tải câu hỏi quiz để chấm điểm");
  }

  return {
    ...(quizSet as RootWordQuizSetRow),
    questions: (questions ?? []) as RootWordQuizQuestionRow[],
  };
}

export async function importRootWordQuizSet(rootWordId: string, questions: RootWordQuizQuestionInput[], createdBy: string) {
  const existingQuiz = await getQuizSetByRootWordId(rootWordId);
  if (existingQuiz) {
    throw new Error(ACTIVE_QUIZ_EXISTS_MESSAGE);
  }

  const supabase = await createServerSupabaseClient();
  const { data: quizSet, error: quizSetError } = await supabase
    .from("root_word_quiz_sets")
    .insert({
      root_word_id: rootWordId,
      question_count: questions.length,
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (quizSetError || !quizSet) {
    unwrapSupabaseError(quizSetError, "Không thể tạo bộ quiz cho từ gốc");
  }

  const payload = questions.map((question, index) => ({
    quiz_set_id: quizSet.id,
    position: index + 1,
    question_type: question.question_type,
    prompt: question.prompt,
    correct_answer: question.correct_answer,
    explanation: question.explanation ?? null,
    option_a: question.question_type === "multiple_choice" ? question.option_a : null,
    option_b: question.question_type === "multiple_choice" ? question.option_b : null,
    option_c: question.question_type === "multiple_choice" ? question.option_c : null,
    option_d: question.question_type === "multiple_choice" ? question.option_d : null,
  }));

  const { error: questionsError } = await supabase.from("root_word_quiz_questions").insert(payload);
  if (questionsError) {
    await supabase.from("root_word_quiz_sets").delete().eq("id", quizSet.id);
    unwrapSupabaseError(questionsError, "Không thể lưu danh sách câu hỏi quiz");
  }

  return {
    quizSetId: quizSet.id as string,
    importedCount: questions.length,
  };
}

export async function deleteRootWordQuizSet(rootWordId: string) {
  const quizSet = await getQuizSetByRootWordId(rootWordId);
  if (!quizSet) {
    return {
      deletedCount: 0,
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("root_word_quiz_sets").delete().eq("id", quizSet.id);
  if (error) {
    unwrapSupabaseError(error, "Không thể xóa quiz của từ gốc");
  }

  return {
    deletedCount: 1,
  };
}
