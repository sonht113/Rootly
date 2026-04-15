"use server";

import { revalidatePath } from "next/cache";

import {
  changeExamStatusSchema,
  createExamSchema,
  deleteQuestionBankItemSchema,
  examQuestionBankItemSchema,
  startExamAttemptSchema,
  syncExamQuestionsSchema,
  updateExamSchema,
} from "@/lib/validations/exams";
import {
  closeExam,
  createExam,
  createQuestionBankItem,
  deleteQuestionBankItem,
  publishExam,
  replaceExamQuestions,
  startExamAttempt,
  updateExamDefinition,
} from "@/server/repositories/exams-repository";

export async function createQuestionBankItemAction(input: unknown) {
  const parsed = examQuestionBankItemSchema.parse(input);
  const item = await createQuestionBankItem(parsed);

  revalidatePath("/teacher/exams");
  return item;
}

export async function deleteQuestionBankItemAction(input: unknown) {
  const parsed = deleteQuestionBankItemSchema.parse(input);
  await deleteQuestionBankItem(parsed.itemId);

  revalidatePath("/teacher/exams");
}

export async function createExamAction(input: unknown) {
  const parsed = createExamSchema.parse(input);
  const exam = await createExam(parsed);

  revalidatePath("/teacher/exams");
  return exam;
}

export async function updateExamAction(input: unknown) {
  const parsed = updateExamSchema.parse(input);
  await updateExamDefinition(parsed);

  revalidatePath("/teacher/exams");
  revalidatePath(`/teacher/exams/${parsed.examId}`);
}

export async function syncExamQuestionsAction(input: unknown) {
  const parsed = syncExamQuestionsSchema.parse(input);
  await replaceExamQuestions(parsed.examId, parsed.questions);

  revalidatePath("/teacher/exams");
  revalidatePath(`/teacher/exams/${parsed.examId}`);
}

export async function publishExamAction(input: unknown) {
  const parsed = changeExamStatusSchema.parse(input);
  await publishExam(parsed.examId);

  revalidatePath("/teacher/exams");
  revalidatePath(`/teacher/exams/${parsed.examId}`);
  revalidatePath("/exams");
  revalidatePath(`/exams/${parsed.examId}`);
  revalidatePath("/ranking");
}

export async function closeExamAction(input: unknown) {
  const parsed = changeExamStatusSchema.parse(input);
  await closeExam(parsed.examId);

  revalidatePath("/teacher/exams");
  revalidatePath(`/teacher/exams/${parsed.examId}`);
  revalidatePath("/exams");
  revalidatePath(`/exams/${parsed.examId}`);
  revalidatePath("/ranking");
}

export async function startExamAttemptAction(input: unknown) {
  const parsed = startExamAttemptSchema.parse(input);
  const attempt = await startExamAttempt(parsed.examId);

  revalidatePath("/exams");
  revalidatePath(`/exams/${parsed.examId}`);

  return attempt;
}
