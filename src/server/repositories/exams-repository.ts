import { randomUUID } from "node:crypto";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toSupabaseDateTime } from "@/lib/utils/exams";
import { getExamAttemptRuntimeState } from "@/lib/utils/exams";
import type {
  ClassRow,
  ExamAttemptDraftRow,
  ExamAttemptDraftSaveResult,
  ExamAttemptQuestion,
  ExamAttemptRow,
  ExamAttemptRuntimeState,
  ExamAttemptStatus,
  ExamAttemptSubmissionResult,
  ExamLeaderboardRow,
  ExamQuestionBankItemRow,
  ExamQuestionRow,
  ExamRow,
  ExamSubmissionAnswer,
} from "@/types/domain";

import type {
  CreateExamInput,
  ExamQuestionBankImportQuestionInput,
  ExamQuestionBankItemInput,
  UpdateExamInput,
} from "@/lib/validations/exams";
import { unwrapSupabaseError } from "@/server/repositories/shared";

type ClassOption = Pick<ClassRow, "id" | "name">;
type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type ExamClassRelation = { id: string; name: string } | Array<{ id: string; name: string }> | null;
type ExamRowWithClass = ExamRow & { class: ExamClassRelation };
type ExamRowWithClassName = ExamRow & { class_name: string | null };

export interface ManageableExamSummary extends ExamRow {
  class_name: string | null;
}

export interface AccessibleExamSummary extends ExamRow {
  class_name: string | null;
  user_attempt: ExamAttemptRow | null;
}

export interface StudentExamDetail {
  exam: ExamRowWithClassName;
  attempt: ExamAttemptRow | null;
  questions: ExamAttemptQuestion[];
  draftAnswers: ExamSubmissionAnswer[];
  runtime: ExamAttemptRuntimeState | null;
  leaderboard: ExamLeaderboardRow[];
}

export interface ExamEditorData {
  exam: ExamRowWithClassName;
  questions: ExamQuestionRow[];
  questionBankItems: ExamQuestionBankItemRow[];
  classes: ClassOption[];
}

interface RpcExamAttemptSubmissionResult {
  attemptId: string;
  examId: string;
  status: ExamAttemptStatus;
  submittedAt: string;
  score: number;
  awardedPoints: number;
  totalPoints: number;
  correctAnswers: number;
  totalQuestions: number;
  durationSeconds: number;
}

interface RpcExamAttemptDraftSaveResult {
  attemptId: string;
  examId: string;
  status: ExamAttemptStatus;
  deadlineAt?: string | null;
  remainingSeconds?: number | null;
  savedAnswerCount?: number | null;
  finalized?: boolean;
  submittedAt?: string | null;
  score?: number | null;
  awardedPoints?: number | null;
  totalPoints?: number | null;
  correctAnswers?: number | null;
  totalQuestions?: number | null;
  durationSeconds?: number | null;
}

export async function getExamManagementOverview() {
  const [questionBankItems, exams, classes] = await Promise.all([
    getQuestionBankItems(),
    getManageableExams(),
    getManageableClasses(),
  ]);

  return {
    questionBankItems,
    exams,
    classes,
  };
}

export async function getQuestionBankItems() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("exam_question_bank_items")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải ngân hàng câu hỏi.");
  }

  return (data ?? []) as ExamQuestionBankItemRow[];
}

export async function createQuestionBankItem(input: ExamQuestionBankItemInput) {
  const supabase = await createServerSupabaseClient();
  const currentUserId = await getCurrentUserId(supabase);

  const payload = {
    created_by: currentUserId,
    prompt: input.prompt,
    question_type: input.question_type,
    correct_answer: input.correct_answer,
    explanation: input.explanation ?? null,
    option_a: input.question_type === "multiple_choice" ? input.option_a : null,
    option_b: input.question_type === "multiple_choice" ? input.option_b : null,
    option_c: input.question_type === "multiple_choice" ? input.option_c : null,
    option_d: input.question_type === "multiple_choice" ? input.option_d : null,
  };

  const { data, error } = await supabase.from("exam_question_bank_items").insert(payload).select("*").single();

  if (error || !data) {
    unwrapSupabaseError(error, "Không thể thêm câu hỏi vào ngân hàng.");
  }

  return data as ExamQuestionBankItemRow;
}

export async function createQuestionBankItems(inputs: ExamQuestionBankImportQuestionInput[]) {
  if (inputs.length === 0) {
    return [] as ExamQuestionBankItemRow[];
  }

  const supabase = await createServerSupabaseClient();
  const currentUserId = await getCurrentUserId(supabase);
  const payload = inputs.map((input) => ({
    created_by: currentUserId,
    prompt: input.prompt,
    question_type: input.question_type,
    correct_answer: input.correct_answer,
    explanation: input.explanation ?? null,
    option_a: input.option_a,
    option_b: input.option_b,
    option_c: input.option_c,
    option_d: input.option_d,
  }));

  const { data, error } = await supabase.from("exam_question_bank_items").insert(payload).select("*");

  if (error || !data) {
    unwrapSupabaseError(error, "Không thể nhập câu hỏi vào ngân hàng.");
  }

  return data as ExamQuestionBankItemRow[];
}

export async function deleteQuestionBankItem(itemId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("exam_question_bank_items").delete().eq("id", itemId);

  if (error) {
    unwrapSupabaseError(error, "Không thể xóa câu hỏi khỏi ngân hàng.");
  }
}

export async function getManageableExams() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("exams")
    .select("*, class:classes(id, name)")
    .order("updated_at", { ascending: false });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách kỳ thi.");
  }

  return ((data ?? []) as ExamRowWithClass[]).map((exam) => ({
    ...exam,
    class_name: resolveRelation(exam.class)?.name ?? null,
  })) as ManageableExamSummary[];
}

export async function getManageableClasses() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("classes").select("id, name").order("name");

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách lớp học.");
  }

  return (data ?? []) as ClassOption[];
}

export async function createExam(input: CreateExamInput) {
  const supabase = await createServerSupabaseClient();
  const currentUserId = await getCurrentUserId(supabase);
  const examId = randomUUID();

  if (input.scope === "class") {
    await assertClassExamCreationAccess(supabase, input.classId);
  }

  const { error } = await supabase
    .from("exams")
    .insert({
      id: examId,
      title: input.title,
      description: input.description ?? null,
      scope: input.scope,
      class_id: input.scope === "class" ? input.classId : null,
      starts_at: toSupabaseDateTime(input.startsAt),
      ends_at: toSupabaseDateTime(input.endsAt),
      duration_minutes: input.durationMinutes,
      created_by: currentUserId,
    });

  if (error) {
    unwrapSupabaseError(error, "Không thể tạo kỳ thi.");
  }

  return {
    id: examId,
  } as Pick<ExamRow, "id">;
}

export async function getExamEditorData(examId: string): Promise<ExamEditorData> {
  const [exam, questions, questionBankItems, classes] = await Promise.all([
    getExamForEditor(examId),
    getExamQuestions(examId),
    getQuestionBankItems(),
    getManageableClasses(),
  ]);

  return {
    exam,
    questions,
    questionBankItems,
    classes,
  };
}

export async function updateExamDefinition(input: UpdateExamInput) {
  const supabase = await createServerSupabaseClient();
  const currentExam = await getExamForEditor(input.examId);

  if (currentExam.status !== "draft") {
    throw new Error("Chỉ có thể chỉnh sửa thông tin khi kỳ thi còn ở trạng thái nháp.");
  }

  const { error } = await supabase
    .from("exams")
    .update({
      title: input.title,
      description: input.description ?? null,
      scope: input.scope,
      class_id: input.scope === "class" ? input.classId : null,
      starts_at: toSupabaseDateTime(input.startsAt),
      ends_at: toSupabaseDateTime(input.endsAt),
      duration_minutes: input.durationMinutes,
    })
    .eq("id", input.examId);

  if (error) {
    unwrapSupabaseError(error, "Không thể cập nhật kỳ thi.");
  }
}

export async function replaceExamQuestions(examId: string, questions: Array<{ questionBankItemId: string; points: number }>) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("replace_exam_questions", {
    p_exam_id: examId,
    p_questions: questions.map((question) => ({
      questionBankItemId: question.questionBankItemId,
      points: question.points,
    })),
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể cập nhật bộ câu hỏi kỳ thi.");
  }
}

export async function publishExam(examId: string) {
  const supabase = await createServerSupabaseClient();
  const currentExam = await getExamForEditor(examId);

  if (currentExam.status !== "draft") {
    throw new Error("Kỳ thi này không còn ở trạng thái nháp để phát hành.");
  }

  const { error } = await supabase.from("exams").update({ status: "published" }).eq("id", examId);
  if (error) {
    unwrapSupabaseError(error, "Không thể phát hành kỳ thi.");
  }
}

export async function closeExam(examId: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("exams").update({ status: "closed" }).eq("id", examId);

  if (error) {
    unwrapSupabaseError(error, "Không thể đóng kỳ thi.");
  }
}

export async function getAccessibleExamsForCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const currentUserId = await getCurrentUserId(supabase);
  const { data: exams, error: examsError } = await supabase
    .from("exams")
    .select("*, class:classes(id, name)")
    .in("status", ["published", "closed"])
    .order("starts_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (examsError) {
    unwrapSupabaseError(examsError, "Không thể tải danh sách kỳ thi.");
  }

  const normalizedExams = (exams ?? []) as ExamRowWithClass[];
  if (normalizedExams.length === 0) {
    return [] as AccessibleExamSummary[];
  }

  const examIds = normalizedExams.map((exam) => exam.id);
  const attempts = await listUserExamAttempts(supabase, currentUserId, examIds);
  const refreshedAttempts = await autoFinalizeExpiredAttempts({
    supabase,
    exams: normalizedExams,
    attempts,
    currentUserId,
  });

  const attemptByExamId = new Map<string, ExamAttemptRow>();
  for (const attempt of refreshedAttempts) {
    attemptByExamId.set(attempt.exam_id, attempt);
  }

  return normalizedExams.map((exam) => ({
    ...exam,
    class_name: resolveRelation(exam.class)?.name ?? null,
    user_attempt: attemptByExamId.get(exam.id) ?? null,
  })) as AccessibleExamSummary[];
}

export async function getStudentExamDetail(examId: string): Promise<StudentExamDetail> {
  const supabase = await createServerSupabaseClient();
  const currentUserId = await getCurrentUserId(supabase);
  const exam = await getExamWithClass(examId, "Không thể tải chi tiết kỳ thi.", supabase);

  let attempt = await getUserExamAttempt(supabase, examId, currentUserId);
  if (attempt && shouldAutoFinalizeExamAttempt(exam, attempt)) {
    await finalizeExpiredAttempt(supabase, attempt.id);
    attempt = await getUserExamAttempt(supabase, examId, currentUserId);
  }

  const runtime = attempt ? getExamAttemptRuntimeState({ exam, attempt }) : null;
  const [questions, draftAnswers, leaderboard] = await Promise.all([
    attempt?.status === "started" ? getExamAttemptQuestions(examId, attempt.id) : Promise.resolve([]),
    attempt?.status === "started" ? getExamAttemptDraftAnswers(supabase, attempt.id) : Promise.resolve([]),
    getExamLeaderboard(examId),
  ]);

  return {
    exam,
    attempt,
    questions,
    draftAnswers,
    runtime,
    leaderboard,
  };
}

export async function startExamAttempt(examId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_exam_attempt", {
    p_exam_id: examId,
  });

  if (error || !data) {
    unwrapSupabaseError(error, "Không thể bắt đầu kỳ thi.");
  }

  return data as ExamAttemptRow;
}

export async function getExamAttemptQuestions(examId: string, attemptId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_exam_attempt_questions", {
    p_exam_id: examId,
    p_attempt_id: attemptId,
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải bộ đề của kỳ thi.");
  }

  return ((data ?? []) as Array<{
    attempt_id: string;
    question_id: string;
    question_position: number;
    question_type: ExamAttemptQuestion["questionType"];
    prompt: string;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    points: number;
  }>).map((question) => ({
    attemptId: question.attempt_id,
    questionId: question.question_id,
    position: question.question_position,
    questionType: question.question_type,
    prompt: question.prompt,
    points: question.points,
    options:
      question.question_type === "multiple_choice"
        ? [question.option_a, question.option_b, question.option_c, question.option_d].filter(
            (option): option is string => Boolean(option),
          )
        : undefined,
  }));
}

export async function saveExamAttemptDraft(attemptId: string, answers: Array<{ questionId: string; userAnswer: string }>) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("save_exam_attempt_draft", {
    p_attempt_id: attemptId,
    p_answers: answers.map((answer) => ({
      questionId: answer.questionId,
      userAnswer: answer.userAnswer,
    })),
  });

  if (error || !data) {
    unwrapSupabaseError(error, "Không thể lưu nháp bài thi.");
  }

  return normalizeDraftSaveResult(data as RpcExamAttemptDraftSaveResult);
}

export async function submitExamAttempt(attemptId: string, answers: Array<{ questionId: string; userAnswer: string }>) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("submit_exam_attempt", {
    p_attempt_id: attemptId,
    p_answers: answers.map((answer) => ({
      questionId: answer.questionId,
      userAnswer: answer.userAnswer,
    })),
  });

  if (error || !data) {
    unwrapSupabaseError(error, "Không thể nộp bài kỳ thi.");
  }

  return normalizeSubmissionResult(data as RpcExamAttemptSubmissionResult);
}

export async function getExamLeaderboard(examId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_exam_leaderboard", {
    p_exam_id: examId,
  });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải bảng xếp hạng kỳ thi.");
  }

  return (data ?? []) as ExamLeaderboardRow[];
}

export async function getExamRankingOptions() {
  const exams = await getAccessibleExamsForCurrentUser();
  return exams.filter((exam) => exam.status !== "draft");
}

export async function getExamRankingDetail(examId: string) {
  return getExamWithClass(examId, "Không thể tải thông tin kỳ thi cho bảng xếp hạng.");
}

async function getExamForEditor(examId: string) {
  return getExamWithClass(examId, "Không thể tải cấu hình kỳ thi.");
}

async function getExamWithClass(examId: string, fallbackMessage: string, supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient ?? (await createServerSupabaseClient());
  const { data, error } = await supabase
    .from("exams")
    .select("*, class:classes(id, name)")
    .eq("id", examId)
    .single();

  if (error || !data) {
    unwrapSupabaseError(error, fallbackMessage);
  }

  const normalized = data as ExamRowWithClass;

  return {
    ...normalized,
    class_name: resolveRelation(normalized.class)?.name ?? null,
  };
}

async function getExamQuestions(examId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("exam_id", examId)
    .order("position", { ascending: true });

  if (error) {
    unwrapSupabaseError(error, "Không thể tải danh sách câu hỏi của kỳ thi.");
  }

  return (data ?? []) as ExamQuestionRow[];
}

async function getCurrentUserId(supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient ?? (await createServerSupabaseClient());
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    unwrapSupabaseError(error, "Không thể xác thực người dùng hiện tại.");
  }

  if (!user) {
    throw new Error("Bạn cần đăng nhập để tiếp tục.");
  }

  return user.id;
}

async function assertClassExamCreationAccess(supabase: SupabaseClient, classId: string | null) {
  if (!classId) {
    throw new Error("Kỳ thi lớp học cần chọn lớp áp dụng.");
  }

  const { data, error } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    unwrapSupabaseError(error, "Không thể xác minh quyền tạo kỳ thi cho lớp học.");
  }

  if (!data) {
    throw new Error("Bạn không có quyền tạo kỳ thi cho lớp này.");
  }
}

async function listUserExamAttempts(supabase: SupabaseClient, currentUserId: string, examIds: string[]) {
  if (examIds.length === 0) {
    return [] as ExamAttemptRow[];
  }

  const { data, error } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("user_id", currentUserId)
    .in("exam_id", examIds);

  if (error) {
    unwrapSupabaseError(error, "Không thể tải trạng thái làm bài của kỳ thi.");
  }

  return (data ?? []) as ExamAttemptRow[];
}

async function getUserExamAttempt(supabase: SupabaseClient, examId: string, currentUserId: string) {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (error) {
    unwrapSupabaseError(error, "Không thể tải lượt làm bài hiện tại.");
  }

  return (data ?? null) as ExamAttemptRow | null;
}

async function getExamAttemptDraftAnswers(supabase: SupabaseClient, attemptId: string) {
  const { data, error } = await supabase
    .from("exam_attempt_drafts")
    .select("exam_question_id, user_answer")
    .eq("exam_attempt_id", attemptId);

  if (error) {
    unwrapSupabaseError(error, "Không thể tải nháp bài thi.");
  }

  return ((data ?? []) as Array<Pick<ExamAttemptDraftRow, "exam_question_id" | "user_answer">>).map((row) => ({
    questionId: row.exam_question_id,
    userAnswer: row.user_answer,
  }));
}

async function autoFinalizeExpiredAttempts({
  supabase,
  exams,
  attempts,
  currentUserId,
}: {
  supabase: SupabaseClient;
  exams: ExamRowWithClass[];
  attempts: ExamAttemptRow[];
  currentUserId: string;
}) {
  const examById = new Map<string, ExamRowWithClass>();
  for (const exam of exams) {
    examById.set(exam.id, exam);
  }

  const expiredAttempts = attempts.filter((attempt) => {
    const exam = examById.get(attempt.exam_id);
    return exam ? shouldAutoFinalizeExamAttempt(exam, attempt) : false;
  });

  if (expiredAttempts.length === 0) {
    return attempts;
  }

  await Promise.all(expiredAttempts.map((attempt) => finalizeExpiredAttempt(supabase, attempt.id)));
  return listUserExamAttempts(
    supabase,
    currentUserId,
    exams.map((exam) => exam.id),
  );
}

function shouldAutoFinalizeExamAttempt(
  exam: Pick<ExamRow, "duration_minutes" | "ends_at">,
  attempt: Pick<ExamAttemptRow, "started_at" | "status">,
) {
  const runtime = getExamAttemptRuntimeState({ exam, attempt });
  return attempt.status === "started" && runtime.isExpired;
}

async function finalizeExpiredAttempt(supabase: SupabaseClient, attemptId: string) {
  const { error } = await supabase.rpc("submit_exam_attempt", {
    p_attempt_id: attemptId,
    p_answers: [],
  });

  if (error && !isStartedAttemptConflict(error.message)) {
    unwrapSupabaseError(error, "Không thể chốt lượt làm bài quá hạn.");
  }
}

function normalizeSubmissionResult(result: RpcExamAttemptSubmissionResult): ExamAttemptSubmissionResult {
  return {
    attemptId: result.attemptId,
    examId: result.examId,
    status: result.status,
    submittedAt: result.submittedAt,
    score: result.score,
    awardedPoints: result.awardedPoints,
    totalPoints: result.totalPoints,
    correctAnswers: result.correctAnswers,
    totalQuestions: result.totalQuestions,
    durationSeconds: result.durationSeconds,
  };
}

function normalizeDraftSaveResult(result: RpcExamAttemptDraftSaveResult): ExamAttemptDraftSaveResult {
  return {
    attemptId: result.attemptId,
    examId: result.examId,
    status: result.status,
    deadlineAt: result.deadlineAt ?? null,
    remainingSeconds: result.remainingSeconds ?? null,
    savedAnswerCount: result.savedAnswerCount ?? 0,
    finalized: Boolean(result.finalized),
    submittedAt: result.submittedAt ?? null,
    score: result.score ?? null,
    awardedPoints: result.awardedPoints ?? null,
    totalPoints: result.totalPoints ?? null,
    correctAnswers: result.correctAnswers ?? null,
    totalQuestions: result.totalQuestions ?? null,
    durationSeconds: result.durationSeconds ?? null,
  };
}

function isStartedAttemptConflict(message: string | undefined) {
  if (!message) {
    return false;
  }

  return message.includes("đang mở");
}

function resolveRelation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}
